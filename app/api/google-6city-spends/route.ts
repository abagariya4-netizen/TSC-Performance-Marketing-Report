import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import * as dates from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

function classifyCampaign(channelType: string, campaignName: string): string {
  const name = campaignName.toLowerCase();
  if (channelType === 'PERFORMANCE_MAX') return 'Performance Max';
  if (channelType === 'SHOPPING') return 'Shopping';
  if (channelType === 'DISPLAY') return 'Display';
  if (channelType === 'DEMAND_GEN' || channelType === 'DISCOVERY') {
    return name.includes('clicks') ? 'Demand Gen Clicks' : 'Demand Gen Video';
  }
  if (channelType === 'SEARCH') {
    return name.includes('brand') ? 'Branded Search' : 'Search';
  }
  return 'Other';
}

function getState(canonicalName: string): string | null {
  const c = canonicalName.toLowerCase();
  if (c.includes('delhi') || c.includes('gurugram') || c.includes('noida') || c.includes('ghaziabad') || c.includes('faridabad')) return 'Delhi+NCR';
  if (c.includes('maharashtra')) return 'Maharashtra';
  if (c.includes('karnataka')) return 'Karnataka';
  if (c.includes('tamil nadu')) return 'Tamil Nadu';
  if (c.includes('telangana')) return 'Telangana';
  if (c.includes('gujarat')) return 'Gujarat';
  return null;
}

const isExcluded = (name: string) => {
  const n = name.toLowerCase();
  return n.includes('vvc') || n.includes('r&f') || n.includes('foc') || n.includes('growth') || n.includes('vrc') || n.includes('rnf');
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

    const states = ["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Delhi+NCR", "Gujarat"];
    const types = ["Search", "Branded Search", "Demand Gen Clicks", "Demand Gen Video", "Performance Max", "Shopping", "Display"];

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
        
        const state = getState(canonical);
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
