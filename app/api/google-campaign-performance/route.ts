import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { getMonthsInRange, getDefaultMonths } from '@/lib/dateRangeUtils';

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
      const def = getDefaultMonths();
      startD = def[0].startDate;
      endD = def[def.length - 1].endDate;
    }

    const periods = getMonthsInRange(new Date(startD), new Date(endD));

    // 1. Build queries for each period (only 1 query per period now, using metrics.conversions_value)
    const queries = periods.map(p => ({
      key: p.label, // use dynamic label
      gaql: `SELECT campaign.name, campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${p.startDate}' AND '${p.endDate}'`
    }));

    // Execute all queries in parallel
    const results = await Promise.all(queries.map(q => queryAllGoogleAdsAccounts(q.gaql).catch(e => {
      console.error(`Error in query ${q.key}:`, e.message);
      return [];
    })));

    // Map: campaignType -> { [monthLabel]: metrics }
    const campaignsMap = new Map<string, any>();
    const TYPES = ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    TYPES.forEach(t => {
      const node: any = { name: t };
      periods.forEach(p => {
        node[p.label] = { spend: 0, clicks: 0, impressions: 0, cv: 0 };
      });
      campaignsMap.set(t, node);
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
    let totalObj: any = {
      vsLastMonth: { spend: 0, roas: 0, cpc: 0, ctr: 0, impressions: 0 },
      vsAvg3M: { spend: 0, roas: 0, cpc: 0, ctr: 0, impressions: 0 }
    };
    periods.forEach(p => {
      totalObj[p.label] = { spend: 0, clicks: 0, impressions: 0, cv: 0, roas: 0, cpc: 0, ctr: 0 };
    });

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

      for (const p of periods) {
        const m = p.label;
        calcMetrics(data[m]);
        totalObj[m].spend += data[m].spend;
        totalObj[m].clicks += data[m].clicks;
        totalObj[m].impressions += data[m].impressions;
        totalObj[m].cv += data[m].cv;
      }

      if (periods.length >= 2) {
        const lastM = periods[periods.length - 1].label;
        const prevM = periods[periods.length - 2].label;
        data.vsLastMonth = {
          spend: calcVs(data[lastM].spend, data[prevM].spend),
          roas: calcVs(data[lastM].roas, data[prevM].roas),
          cpc: calcVs(data[lastM].cpc, data[prevM].cpc),
          ctr: calcVs(data[lastM].ctr, data[prevM].ctr),
          impressions: calcVs(data[lastM].impressions, data[prevM].impressions),
        };
      }

      if (periods.length >= 4) {
        const lastM = periods[periods.length - 1].label;
        const m3 = periods[periods.length - 2].label;
        const m2 = periods[periods.length - 3].label;
        const m1 = periods[periods.length - 4].label;
        
        const avg3M_spend = (data[m1].spend + data[m2].spend + data[m3].spend) / 3;
        const avg3M_roas = (data[m1].roas + data[m2].roas + data[m3].roas) / 3;
        const avg3M_cpc = (data[m1].cpc + data[m2].cpc + data[m3].cpc) / 3;
        const avg3M_ctr = (data[m1].ctr + data[m2].ctr + data[m3].ctr) / 3;
        const avg3M_impressions = (data[m1].impressions + data[m2].impressions + data[m3].impressions) / 3;

        data.vsAvg3M = {
          spend: calcVs(data[lastM].spend, avg3M_spend),
          roas: calcVs(data[lastM].roas, avg3M_roas),
          cpc: calcVs(data[lastM].cpc, avg3M_cpc),
          ctr: calcVs(data[lastM].ctr, avg3M_ctr),
          impressions: calcVs(data[lastM].impressions, avg3M_impressions),
        };
      }

      finalCampaigns.push(data);
    }

    // Calc Total metrics
    for (const p of periods) {
      calcMetrics(totalObj[p.label]);
    }

    if (periods.length >= 2) {
      const lastM = periods[periods.length - 1].label;
      const prevM = periods[periods.length - 2].label;
      totalObj.vsLastMonth = {
        spend: calcVs(totalObj[lastM].spend, totalObj[prevM].spend),
        roas: calcVs(totalObj[lastM].roas, totalObj[prevM].roas),
        cpc: calcVs(totalObj[lastM].cpc, totalObj[prevM].cpc),
        ctr: calcVs(totalObj[lastM].ctr, totalObj[prevM].ctr),
        impressions: calcVs(totalObj[lastM].impressions, totalObj[prevM].impressions),
      };
    }

    if (periods.length >= 4) {
      const lastM = periods[periods.length - 1].label;
      const m3 = periods[periods.length - 2].label;
      const m2 = periods[periods.length - 3].label;
      const m1 = periods[periods.length - 4].label;
      
      const avg3MTotal_spend = (totalObj[m1].spend + totalObj[m2].spend + totalObj[m3].spend) / 3;
      const avg3MTotal_roas = (totalObj[m1].roas + totalObj[m2].roas + totalObj[m3].roas) / 3;
      const avg3MTotal_cpc = (totalObj[m1].cpc + totalObj[m2].cpc + totalObj[m3].cpc) / 3;
      const avg3MTotal_ctr = (totalObj[m1].ctr + totalObj[m2].ctr + totalObj[m3].ctr) / 3;
      const avg3MTotal_impressions = (totalObj[m1].impressions + totalObj[m2].impressions + totalObj[m3].impressions) / 3;

      totalObj.vsAvg3M = {
        spend: calcVs(totalObj[lastM].spend, avg3MTotal_spend),
        roas: calcVs(totalObj[lastM].roas, avg3MTotal_roas),
        cpc: calcVs(totalObj[lastM].cpc, avg3MTotal_cpc),
        ctr: calcVs(totalObj[lastM].ctr, avg3MTotal_ctr),
        impressions: calcVs(totalObj[lastM].impressions, avg3MTotal_impressions),
      };
    }

    return NextResponse.json({
      campaigns: finalCampaigns,
      total: totalObj,
      monthLabels: periods.map(p => p.label)
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
