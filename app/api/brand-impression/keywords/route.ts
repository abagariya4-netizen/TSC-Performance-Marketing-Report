import { NextRequest, NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    let startD = searchParams.get('startDate');
    let endD = searchParams.get('endDate');

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
    }

    if (!startD || !endD) {
      startD = '2026-06-01';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      endD = yesterday.toISOString().split('T')[0];
    }

    const periods = [
      { key: 'mar', start: '2026-03-01', end: '2026-03-31' },
      { key: 'apr', start: '2026-04-01', end: '2026-04-30' },
      { key: 'may', start: '2026-05-01', end: '2026-05-31' },
      { key: 'jun', start: startD, end: endD }
    ];

    const queries = periods.map(p => ({
      key: p.key,
      gaql: `
        SELECT
          ad_group_criterion.keyword.text,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions_value,
          metrics.search_impression_share
        FROM keyword_view
        WHERE campaign.id = '${campaignId}'
        AND segments.date BETWEEN '${p.start}' AND '${p.end}'
        AND ad_group_criterion.status != 'REMOVED'
      `
    }));

    const results = await Promise.all(queries.map(q => queryAllGoogleAdsAccounts(q.gaql).catch(e => {
      console.error(`Error in query ${q.key}:`, e.message);
      return [];
    })));

    const keywordsMap = new Map<string, any>();

    const getKeywordNode = (keyword: string) => {
      if (!keywordsMap.has(keyword)) {
        keywordsMap.set(keyword, {
          keyword,
          mar: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 0 },
          apr: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 0 },
          may: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 0 },
          jun: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 0 }
        });
      }
      return keywordsMap.get(keyword);
    };

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const res = results[i];

      for (const row of res) {
        const kwText = row.adGroupCriterion?.keyword?.text;
        if (!kwText) continue;

        const node = getKeywordNode(kwText);
        const m = node[q.key];

        const spend = Number(row.metrics?.costMicros || 0) / 1000000;
        const impressions = Number(row.metrics?.impressions || 0);
        const clicks = Number(row.metrics?.clicks || 0);
        const cv = Number(row.metrics?.conversionsValue || 0);
        const impressionShare = Number(row.metrics?.searchImpressionShare || 0);

        m.spend += spend;
        m.impressions += impressions;
        m.clicks += clicks;
        m.cv += cv;
        // Since we are aggregating potentially across ad groups for the same keyword text
        // we keep track of eligible impressions to compute accurate weighted average.
        if (impressionShare > 0) {
          m.eligibleImpr += impressions / impressionShare;
        } else if (impressions > 0 && impressionShare === 0) {
          // If impression share is exactly 0 but there are impressions, it's typically < 10%.
          // In Google Ads API, < 10% is returned as 0.0999 usually, but if 0, we can't reliably compute.
        }
      }
    }

    const finalKeywords = [];
    const totalObj = {
      mar: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 100 },
      apr: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 100 },
      may: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 100 },
      jun: { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 100 }
    };

    for (const data of Array.from(keywordsMap.values())) {
      // Calculate impression share % for each keyword row
      for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
        const monthData = data[m];
        monthData.impressionShare = monthData.eligibleImpr > 0 ? (monthData.impressions / monthData.eligibleImpr) * 100 : 0;
        
        totalObj[m].spend += monthData.spend;
        totalObj[m].impressions += monthData.impressions;
        totalObj[m].clicks += monthData.clicks;
        totalObj[m].cv += monthData.cv;
        totalObj[m].eligibleImpr += monthData.eligibleImpr;
      }
      finalKeywords.push(data);
    }

    // Calc Total Row derived metrics
    for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
      const t = totalObj[m];
      t.impressionShare = t.eligibleImpr > 0 ? (t.impressions / t.eligibleImpr) * 100 : 0;
      t.cpc = t.clicks > 0 ? t.spend / t.clicks : 0;
      t.ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
      t.roas = t.spend > 0 ? t.cv / t.spend : 0;
      t.spendSalience = 100;
    }

    for (const kw of finalKeywords) {
      for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
        const d = kw[m];
        const t = totalObj[m];
        d.cpc = d.clicks > 0 ? d.spend / d.clicks : 0;
        d.ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
        d.roas = d.spend > 0 ? d.cv / d.spend : 0;
        d.spendSalience = t.spend > 0 ? (d.spend / t.spend) * 100 : 0;
      }
    }

    // Sort by Jun spend descending
    finalKeywords.sort((a, b) => b.jun.spend - a.jun.spend);

    return NextResponse.json({
      keywords: finalKeywords,
      total: totalObj
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
