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

const CATEGORY_CONVERSION_MAP: Record<string, string> = {
  'Mattress': 'cl_overall_mattress_purchase',
  'Chair': 'cl_overall_chair_purchase',
  'Sofa': 'cl_overall_sofa_purchase',
  'Desk': 'cl_overall_desk_purchase',
  'Elite': 'elite_purchase_offline',
  'Foot Massager': 'cl_overall_foot_massager_purchase',
  'Accessories': 'omni_purchase',
  'Bed': 'omni_purchase',
  'All / others': 'omni_purchase'
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category') || 'All';
    const typeFilter = searchParams.get('campaignType') || 'All';
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

    // 1. Fetch Conversion Actions to map resource_name to name
    const caQuery = `SELECT conversion_action.resource_name, conversion_action.name FROM conversion_action`;
    const caRes = await queryAllGoogleAdsAccounts(caQuery);
    const caMap = new Map<string, string>();
    for (const r of caRes) {
      if (r.conversionAction?.resourceName && r.conversionAction?.name) {
        caMap.set(r.conversionAction.resourceName, r.conversionAction.name);
      }
    }

    // 2. Build queries for each period
    const queries = periods.flatMap(p => [
      {
        key: p.key,
        type: 'cost',
        gaql: `SELECT campaign.name, campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions FROM campaign WHERE segments.date BETWEEN '${p.start}' AND '${p.end}'`
      },
      {
        key: p.key,
        type: 'conv',
        gaql: `SELECT campaign.name, segments.conversion_action, metrics.conversions_value, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${p.start}' AND '${p.end}' AND metrics.conversions > 0`
      }
    ]);

    // Execute all queries in parallel
    const results = await Promise.all(queries.map(q => queryAllGoogleAdsAccounts(q.gaql).catch(e => {
      console.error(`Error in query ${q.key} ${q.type}:`, e.message);
      return [];
    })));

    // Organize raw data
    // Map: campaignName -> { mar: metrics, apr: metrics, may: metrics, jun: metrics, type, category }
    const campaignsMap = new Map<string, any>();

    const getCampNode = (name: string, channelType?: string) => {
      if (!campaignsMap.has(name)) {
        campaignsMap.set(name, {
          name,
          channelType: channelType || '',
          type: '',
          category: getCategory(name),
          mar: { spend: 0, clicks: 0, impressions: 0, cv: 0 },
          apr: { spend: 0, clicks: 0, impressions: 0, cv: 0 },
          may: { spend: 0, clicks: 0, impressions: 0, cv: 0 },
          jun: { spend: 0, clicks: 0, impressions: 0, cv: 0 }
        });
      }
      return campaignsMap.get(name);
    };

    // Process Cost/Clicks/Impressions
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const res = results[i];
      if (q.type === 'cost') {
        for (const row of res) {
          const name = row.campaign?.name;
          if (!name) continue;
          if (isExcluded(name)) continue;

          const node = getCampNode(name, row.campaign?.advertisingChannelType);
          node[q.key].spend += Number(row.metrics?.costMicros || 0) / 1000000;
          node[q.key].clicks += Number(row.metrics?.clicks || 0);
          node[q.key].impressions += Number(row.metrics?.impressions || 0);
        }
      }
    }

    // Process Conversions
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const res = results[i];
      if (q.type === 'conv') {
        for (const row of res) {
          const name = row.campaign?.name;
          if (!name) continue;
          if (isExcluded(name)) continue;
          
          const caResource = row.segments?.conversionAction;
          const caName = caMap.get(caResource) || '';
          
          const node = getCampNode(name);
          const expectedCaName = CATEGORY_CONVERSION_MAP[node.category];

          // If the conversion action matches the expected one for the category
          if (caName.toLowerCase() === expectedCaName.toLowerCase()) {
            node[q.key].cv += Number(row.metrics?.conversionsValue || 0);
          }
        }
      }
    }

    // Compute derived metrics and filter
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
      data.type = getCampaignType(data.channelType, name);

      // Apply Filters
      if (categoryFilter !== 'All' && data.category !== categoryFilter) continue;
      if (typeFilter !== 'All' && data.type !== typeFilter) continue;

      // Skip empty rows (no spend, no impressions) across all 4 months
      if (data.mar.spend===0 && data.apr.spend===0 && data.may.spend===0 && data.jun.spend===0 &&
          data.mar.impressions===0 && data.apr.impressions===0 && data.may.impressions===0 && data.jun.impressions===0) {
        continue;
      }

      for (const m of ['mar', 'apr', 'may', 'jun']) {
        calcMetrics(data[m]);
        totalObj[m as keyof typeof totalObj].spend += data[m].spend;
        totalObj[m as keyof typeof totalObj].clicks += data[m].clicks;
        totalObj[m as keyof typeof totalObj].impressions += data[m].impressions;
        totalObj[m as keyof typeof totalObj].cv += data[m].cv;
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
    for (const m of ['mar', 'apr', 'may', 'jun']) {
      calcMetrics(totalObj[m as keyof typeof totalObj]);
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
