import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import * as dates from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

function classifyCampaign(channelType: string, campaignName: string): string {
  const n = campaignName.toLowerCase();
  if (channelType === 'SEARCH' && !n.includes('brand')) {
    const isNew = n.includes('mum') || n.includes('hyd') || n.includes('chen') || n.includes('beng') || n.includes('del') || n.includes('ncr') || n.includes('ahm') || n.includes('guj') || n.includes('surat') || n.includes('rajkot');
    return isNew ? 'Search Non-Brand New' : 'Search Non-Brand Old';
  }
  if (channelType === 'SEARCH' && n.includes('brand')) return 'Search Brand';
  if (channelType === 'DEMAND_GEN' || channelType === 'DISCOVERY') {
    return n.includes('click') ? 'Demand Gen Clicks' : 'Demand Gen Video';
  }
  if (channelType === 'PERFORMANCE_MAX') return 'Performance Max';
  if (channelType === 'SHOPPING') return 'Shopping';
  if (channelType === 'DISPLAY') return 'Display';
  return 'Other';
}

function getGeoCityGroup(canonicalName: string): string | null {
  const c = canonicalName.toLowerCase();
  if (c.includes('mumbai')) return 'Mumbai';
  if (c.includes('bengaluru')) return 'Bengaluru';
  if (c.includes('chennai')) return 'Chennai';
  if (c.includes('hyderabad')) return 'Hyderabad';
  if (c.includes('ahmedabad') || c.includes('surat') || c.includes('rajkot') || c.includes('vadodara')) return 'Gujarat';
  if (c.includes('delhi') || c.includes('noida') || c.includes('gurugram') || c.includes('ghaziabad') || c.includes('faridabad')) return 'Delhi+NCR';
  return null;
}

const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf', 'chair', 'sofa', 'desk', 'elite', 'foot', 'bed', 'acce', 'pillow', 'cushion', 'massa', 'sensai', 'boost'];

const isExcluded = (name: string) => {
  const n = name.toLowerCase();
  if (!n.includes('mat')) return true; // Only mattress campaigns
  for (const ex of exclusions) {
    if (n.includes(ex)) return true;
  }
  return false;
};

export async function GET() {
  try {
    const { sinceMTD, sinceYday, daysPassed, totalDays, daysRemaining, displayMonth } = dates.getDateParams();

    const geoMtdQuery = `
      SELECT campaign.name, campaign.advertising_channel_type, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date BETWEEN '${sinceMTD}' AND '${sinceYday}'
    `;
    
    const geoYdayQuery = `
      SELECT campaign.name, campaign.advertising_channel_type, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date = '${sinceYday}'
    `;

    const campMtdQuery = `
      SELECT campaign.name, metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${sinceMTD}' AND '${sinceYday}'
    `;

    const campYdayQuery = `
      SELECT campaign.name, metrics.cost_micros
      FROM campaign
      WHERE segments.date = '${sinceYday}'
    `;

    const constantsQuery = `
      SELECT geo_target_constant.resource_name, geo_target_constant.canonical_name
      FROM geo_target_constant
      WHERE geo_target_constant.country_code = 'IN'
    `;

    const [geoMtd, geoYday, campMtd, campYday, constants] = await Promise.all([
      queryAllGoogleAdsAccounts(geoMtdQuery),
      queryAllGoogleAdsAccounts(geoYdayQuery),
      queryAllGoogleAdsAccounts(campMtdQuery),
      queryAllGoogleAdsAccounts(campYdayQuery),
      queryAllGoogleAdsAccounts(constantsQuery)
    ]);

    const constMap = new Map<string, string>();
    for (const c of constants) {
      if (c.geoTargetConstant) {
        constMap.set(c.geoTargetConstant.resourceName, c.geoTargetConstant.canonicalName);
      }
    }

    const states = ["Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Gujarat", "Delhi+NCR"];
    const types = ["Search Non-Brand New", "Search Non-Brand Old", "Search Brand", "Demand Gen Video", "Demand Gen Clicks", "Performance Max", "Shopping", "Display"];

    const result: any = {
      geo_total_mtd: 0,
      geo_total_yday: 0,
      campaign_total_mtd: 0,
      campaign_total_yday: 0,
    };

    states.forEach(s => {
      result[s] = {};
      types.forEach(t => result[s][t] = { mtd: 0, yday: 0 });
    });

    const processGeo = (rows: any[], isMtd: boolean) => {
      let geoTotal = 0;
      for (const r of rows) {
        if (!r.campaign || isExcluded(r.campaign.name)) continue;
        const cost = parseInt(r.metrics.costMicros) / 1000000;
        geoTotal += cost;
        
        const rName = r.segments.geoTargetCity;
        const canonical = constMap.get(rName);
        if (!canonical) continue;
        
        const state = getGeoCityGroup(canonical);
        if (state) {
          const type = classifyCampaign(r.campaign.advertisingChannelType, r.campaign.name);
          if (types.includes(type)) {
            if (isMtd) result[state][type].mtd += cost;
            else result[state][type].yday += cost;
          }
        }
      }
      return geoTotal;
    };

    result.geo_total_mtd = processGeo(geoMtd, true);
    result.geo_total_yday = processGeo(geoYday, false);

    const processCamp = (rows: any[]) => {
      let campTotal = 0;
      for (const r of rows) {
        if (!r.campaign || isExcluded(r.campaign.name)) continue;
        campTotal += parseInt(r.metrics.costMicros) / 1000000;
      }
      return campTotal;
    };

    result.campaign_total_mtd = processCamp(campMtd);
    result.campaign_total_yday = processCamp(campYday);

    return NextResponse.json({
      data: result,
      dates: {
        sinceMTD,
        sinceYday,
        daysPassed,
        totalDays,
        daysRemaining,
        displayMonth
      }
    });

  } catch (error: any) {
    console.error('Google Ads 6 City error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
