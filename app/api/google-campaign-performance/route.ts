import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

const EXCLUDED_KEYWORDS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

function isExcluded(campaignName: string) {
  const lower = campaignName.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw));
}

function getCampaignType(channelType: string, name: string) {
  const lower = name.toLowerCase();
  if (channelType === 'SEARCH' && !lower.includes('brand')) return 'Search';
  if (channelType === 'SEARCH' && lower.includes('brand')) return 'Branded Search';
  if (channelType === 'DEMAND_GEN' && lower.includes('clicks')) return 'Demand Gen Clicks';
  if (channelType === 'DEMAND_GEN' && !lower.includes('clicks')) return 'Demand Gen Video';
  if (channelType === 'PERFORMANCE_MAX') return 'Performance Max';
  if (channelType === 'SHOPPING') return 'Shopping';
  if (channelType === 'DISPLAY') return 'Display';
  return 'Other';
}

function getCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('mat')) return 'Mattress';
  if (lower.includes('chair')) return 'Chair';
  if (lower.includes('sofa')) return 'Sofa';
  if (lower.includes('desk')) return 'Desk';
  if (lower.includes('elite')) return 'Elite';
  if (lower.includes('foot')) return 'Foot Massager';
  if (lower.includes('acce')) return 'Accessories';
  if (lower.includes('bed')) return 'Bed';
  return 'All / others';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category') || 'All';
    let startD = searchParams.get('startDate');
    let endD = searchParams.get('endDate');

    if (!startD || !endD) {
      // Default to June 1 to yesterday
      startD = '2026-06-01';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      endD = yesterday.toISOString().split('T')[0];
    }

    // Hardcode 4 months as specified
    const periods = [
      { key: 'mar', start: '2026-03-01', end: '2026-03-31' },
      { key: 'apr', start: '2026-04-01', end: '2026-04-30' },
      { key: 'may', start: '2026-05-01', end: '2026-05-31' },
      { key: 'jun', start: startD, end: endD }
    ];

    // 1. Build queries for each period (only 1 query per period now, using metrics.conversions_value)
    const queries = periods.map(p => ({
      key: p.key,
      gaql: `SELECT campaign.name, campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${p.start}' AND '${p.end}'`
    }));

    // Execute all queries in parallel
    const results = await Promise.all(queries.map(q => queryAllGoogleAdsAccounts(q.gaql).catch(e => {
      console.error(`Error in query ${q.key}:`, e.message);
      return [];
    })));

    // Map: campaignType -> { mar: metrics, apr: metrics, may: metrics, jun: metrics }
    const campaignsMap = new Map<string, any>();
    const TYPES = ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    TYPES.forEach(t => {
      campaignsMap.set(t, {
        name: t,
        mar: { spend: 0, clicks: 0, impressions: 0, cv: 0 },
        apr: { spend: 0, clicks: 0, impressions: 0, cv: 0 },
        may: { spend: 0, clicks: 0, impressions: 0, cv: 0 },
        jun: { spend: 0, clicks: 0, impressions: 0, cv: 0 }
      });
    });

    // Process Cost/Clicks/Impressions/CV
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const res = results[i];
      for (const row of res) {
        const name = row.campaign?.name;
        if (!name) continue;
        if (isExcluded(name)) continue;

        const category = getCategory(name);
        if (categoryFilter !== 'All' && category !== categoryFilter) continue;

        const type = getCampaignType(row.campaign?.advertisingChannelType || '', name);
        const node = campaignsMap.get(type);
        if (!node) continue;
        node[q.key].spend += Number(row.metrics?.costMicros || 0) / 1000000;
        node[q.key].clicks += Number(row.metrics?.clicks || 0);
        node[q.key].impressions += Number(row.metrics?.impressions || 0);
        node[q.key].cv += Number(row.metrics?.conversionsValue || 0);
      }
    }

    const finalCampaigns = [];
    let totalObj = {
      mar: { spend: 0, clicks: 0, impressions: 0, cv: 0, roas: 0, cpc: 0, ctr: 0 },
      apr: { spend: 0, clicks: 0, impressions: 0, cv: 0, roas: 0, cpc: 0, ctr: 0 },
      may: { spend: 0, clicks: 0, impressions: 0, cv: 0, roas: 0, cpc: 0, ctr: 0 },
      jun: { spend: 0, clicks: 0, impressions: 0, cv: 0, roas: 0, cpc: 0, ctr: 0 },
      vsLastMonth: { spend: 0, roas: 0, cpc: 0, ctr: 0, impressions: 0 },
      vsAvg3M: { spend: 0, roas: 0, cpc: 0, ctr: 0, impressions: 0 }
    };

    const calcMetrics = (m: any) => {
      m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
      m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      m.roas = m.spend > 0 ? m.cv / m.spend : 0;
    };

    const calcVs = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current / previous) - 1) * 100;
    };

    for (const [name, data] of Array.from(campaignsMap.entries())) {

      for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
        calcMetrics(data[m]);
        totalObj[m].spend += data[m].spend;
        totalObj[m].clicks += data[m].clicks;
        totalObj[m].impressions += data[m].impressions;
        totalObj[m].cv += data[m].cv;
      }

      data.vsLastMonth = {
        spend: calcVs(data.jun.spend, data.may.spend),
        roas: calcVs(data.jun.roas, data.may.roas),
        cpc: calcVs(data.jun.cpc, data.may.cpc),
        ctr: calcVs(data.jun.ctr, data.may.ctr),
        impressions: calcVs(data.jun.impressions, data.may.impressions),
      };

      const avg3M_spend = (data.mar.spend + data.apr.spend + data.may.spend) / 3;
      const avg3M_roas = (data.mar.roas + data.apr.roas + data.may.roas) / 3;
      const avg3M_cpc = (data.mar.cpc + data.apr.cpc + data.may.cpc) / 3;
      const avg3M_ctr = (data.mar.ctr + data.apr.ctr + data.may.ctr) / 3;
      const avg3M_impressions = (data.mar.impressions + data.apr.impressions + data.may.impressions) / 3;

      data.vsAvg3M = {
        spend: calcVs(data.jun.spend, avg3M_spend),
        roas: calcVs(data.jun.roas, avg3M_roas),
        cpc: calcVs(data.jun.cpc, avg3M_cpc),
        ctr: calcVs(data.jun.ctr, avg3M_ctr),
        impressions: calcVs(data.jun.impressions, avg3M_impressions),
      };

      finalCampaigns.push(data);
    }

    // Calc Total metrics
    for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
      calcMetrics(totalObj[m]);
    }

    totalObj.vsLastMonth = {
      spend: calcVs(totalObj.jun.spend, totalObj.may.spend),
      roas: calcVs(totalObj.jun.roas, totalObj.may.roas),
      cpc: calcVs(totalObj.jun.cpc, totalObj.may.cpc),
      ctr: calcVs(totalObj.jun.ctr, totalObj.may.ctr),
      impressions: calcVs(totalObj.jun.impressions, totalObj.may.impressions),
    };

    const avg3MTotal_spend = (totalObj.mar.spend + totalObj.apr.spend + totalObj.may.spend) / 3;
    const avg3MTotal_roas = (totalObj.mar.roas + totalObj.apr.roas + totalObj.may.roas) / 3;
    const avg3MTotal_cpc = (totalObj.mar.cpc + totalObj.apr.cpc + totalObj.may.cpc) / 3;
    const avg3MTotal_ctr = (totalObj.mar.ctr + totalObj.apr.ctr + totalObj.may.ctr) / 3;
    const avg3MTotal_impressions = (totalObj.mar.impressions + totalObj.apr.impressions + totalObj.may.impressions) / 3;

    totalObj.vsAvg3M = {
      spend: calcVs(totalObj.jun.spend, avg3MTotal_spend),
      roas: calcVs(totalObj.jun.roas, avg3MTotal_roas),
      cpc: calcVs(totalObj.jun.cpc, avg3MTotal_cpc),
      ctr: calcVs(totalObj.jun.ctr, avg3MTotal_ctr),
      impressions: calcVs(totalObj.jun.impressions, avg3MTotal_impressions),
    };

    return NextResponse.json({
      campaigns: finalCampaigns,
      total: totalObj
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
