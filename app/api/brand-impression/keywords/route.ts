import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { getMonthsInRange, getDefaultMonths } from '@/lib/dateRangeUtils';

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
      const def = getDefaultMonths();
      startD = def[0].startDate;
      endD = def[def.length - 1].endDate;
    }

    const periods = getMonthsInRange(new Date(startD), new Date(endD));

    const queries = periods.map(p => ({
      key: p.label,
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
        AND segments.date BETWEEN '${p.startDate}' AND '${p.endDate}'
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
        const node: any = { keyword };
        periods.forEach(p => {
          node[p.label] = { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 0 };
        });
        keywordsMap.set(keyword, node);
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
    const totalObj: any = {};
    periods.forEach(p => {
      totalObj[p.label] = { spend: 0, impressions: 0, impressionShare: 0, eligibleImpr: 0, clicks: 0, cv: 0, cpc: 0, ctr: 0, roas: 0, spendSalience: 100 };
    });

    for (const data of Array.from(keywordsMap.values())) {
      // Calculate impression share % for each keyword row
      for (const p of periods) {
        const m = p.label;
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
    for (const p of periods) {
      const m = p.label;
      const t = totalObj[m];
      t.impressionShare = t.eligibleImpr > 0 ? (t.impressions / t.eligibleImpr) * 100 : 0;
      t.cpc = t.clicks > 0 ? t.spend / t.clicks : 0;
      t.ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
      t.roas = t.spend > 0 ? t.cv / t.spend : 0;
      t.spendSalience = 100;
    }

    for (const kw of finalKeywords) {
      for (const p of periods) {
        const m = p.label;
        const d = kw[m];
        const t = totalObj[m];
        d.cpc = d.clicks > 0 ? d.spend / d.clicks : 0;
        d.ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
        d.roas = d.spend > 0 ? d.cv / d.spend : 0;
        d.spendSalience = t.spend > 0 ? (d.spend / t.spend) * 100 : 0;
      }
    }

    // Sort by last month spend descending
    if (periods.length > 0) {
      const lastM = periods[periods.length - 1].label;
      finalKeywords.sort((a, b) => b[lastM].spend - a[lastM].spend);
    }

    return NextResponse.json({
      keywords: finalKeywords,
      total: totalObj,
      monthLabels: periods.map(p => p.label)
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
