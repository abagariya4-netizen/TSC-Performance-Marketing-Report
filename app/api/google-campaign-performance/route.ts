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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatDate = (d: Date): string => { return d.toISOString().split('T')[0]; };

    const periods: { label: string; startDate: string; endDate: string }[] = [];
    for (let i = 3; i >= 1; i--) {
      const mStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      periods.push({
        label: monthNames[mStart.getMonth()],
        startDate: formatDate(mStart),
        endDate: formatDate(mEnd)
      });
    }

    const curMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    periods.push({
      label: monthNames[curMonthStart.getMonth()],
      startDate: formatDate(curMonthStart),
      endDate: formatDate(yesterday)
    });

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
    let totalObj: any = {};
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

      finalCampaigns.push(data);
    }

    // Calc Total metrics
    for (const p of periods) {
      calcMetrics(totalObj[p.label]);
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
