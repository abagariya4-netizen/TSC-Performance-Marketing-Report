import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { getDateParams } from '@/lib/dateUtils';
import { getMappedCity } from '@/lib/googleCityMapping';

export const dynamic = 'force-dynamic';

function classifyCampaign(channelType: string, campaignName: string): string | null {
  const name = campaignName.toLowerCase();
  if (channelType === 'PERFORMANCE_MAX') return 'Performance Max';
  if (channelType === 'SHOPPING') return 'Shopping';
  if (channelType === 'DISPLAY') return 'Display';
  if (channelType === 'DEMAND_GEN') {
    return name.includes('click') ? 'Demand Gen Clicks' : 'Demand Gen Video';
  }
  if (channelType === 'SEARCH') {
    return name.includes('brand') ? 'Branded Search' : 'Search';
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mappingParam = searchParams.get('mapping');
    const category = searchParams.get('category') || 'All';
    const city = searchParams.get('city') || 'Maharashtra';
    
    let customMapping: Record<string, string> | null = null;
    if (mappingParam) {
      try { customMapping = JSON.parse(mappingParam); } catch (e) {}
    }
    const dates = getDateParams();

    const gaqlGeoMTD = `
      SELECT campaign.name, campaign.advertising_channel_type, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date BETWEEN '${dates.sinceMTD}' AND '${dates.untilYday}'
    `;
    
    const gaqlGeoYday = `
      SELECT campaign.name, campaign.advertising_channel_type, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date = '${dates.untilYday}'
    `;
    
    const geoConstantsQuery = `
      SELECT geo_target_constant.name, geo_target_constant.resource_name, geo_target_constant.canonical_name
      FROM geo_target_constant
      WHERE geo_target_constant.country_code = 'IN'
    `;

    const [geoConstantsRes, geoMtdRes, geoYdayRes] = await Promise.all([
      queryAllGoogleAdsAccounts(geoConstantsQuery),
      queryAllGoogleAdsAccounts(gaqlGeoMTD),
      queryAllGoogleAdsAccounts(gaqlGeoYday),
    ]);

    const geoMap = new Map<string, { canonicalName: string, name: string }>();
    for (const row of geoConstantsRes) {
      const rn = row.geoTargetConstant?.resourceName;
      const canonicalName = row.geoTargetConstant?.canonicalName;
      const name = row.geoTargetConstant?.name;
      if (rn && canonicalName && name) {
        geoMap.set(rn, { canonicalName, name });
      }
    }

    const campaignTypes = ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    
    const result: any = { rows: {} };
    campaignTypes.forEach(t => result.rows[t] = { mtd: 0, yesterday: 0 });
    result.total = { mtd: 0, yesterday: 0 };

    const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

    const processResults = (res: any[], timePeriod: 'mtd' | 'yesterday') => {
      for (const row of res) {
        const campaignName = row.campaign?.name || '';
        const nameLower = campaignName.toLowerCase();
        
        let isExcluded = false;
        for (const ex of exclusions) {
          if (nameLower.includes(ex)) {
            isExcluded = true;
            break;
          }
        }
        if (isExcluded) continue;

        if (category === 'Mattress' && !nameLower.includes('mat')) continue;
        if (category === 'Chair' && !nameLower.includes('chair')) continue;
        if (category === 'Sofa' && !nameLower.includes('sofa')) continue;
        if (category === 'Desk' && !nameLower.includes('desk')) continue;
        if (category === 'Elite' && !nameLower.includes('elite')) continue;
        if (category === 'Foot Massager' && !nameLower.includes('foot')) continue;
        if (category === 'Accessories' && !nameLower.includes('acce')) continue;
        if (category === 'Bed' && !nameLower.includes('bed')) continue;

        const resourceName = row.segments?.geoTargetCity;
        if (!resourceName) continue;
        
        const geoData = geoMap.get(resourceName);
        if (!geoData) continue;

        const mappedName = getMappedCity(geoData.name, customMapping);
        let cityBucket = mappedName;
        if (['Delhi', 'Noida', 'Gurgaon', 'Ghaziabad', 'Faridabad'].includes(mappedName)) {
          cityBucket = 'Delhi+NCR';
        } else if (['Ahmedabad', 'Gandhinagar', 'Surat', 'Rajkot', 'Vadodara'].includes(mappedName)) {
          cityBucket = 'Gujarat';
        }

        const stateToCityBucket: Record<string, string> = {
          'Maharashtra': 'Mumbai',
          'Karnataka': 'Bengaluru',
          'Tamil Nadu': 'Chennai',
          'Telangana': 'Hyderabad',
          'Delhi+NCR': 'Delhi+NCR',
          'Gujarat': 'Gujarat'
        };
        const targetBucket = stateToCityBucket[city];

        if (cityBucket !== targetBucket) continue;

        const channelType = row.campaign?.advertisingChannelType || '';
        let campType = classifyCampaign(channelType, campaignName);
        if (!campType) continue; 

        const cost = parseFloat(row.metrics?.costMicros || '0') / 1000000;

        result.rows[campType][timePeriod] += cost;
        result.total[timePeriod] += cost;
      }
    };

    processResults(geoMtdRes, 'mtd');
    processResults(geoYdayRes, 'yesterday');

    result.dateInfo = {
      monthName: dates.sinceMTD, 
      dayOfMonth: dates.daysPassed,
      daysRemaining: dates.daysRemaining,
      totalDays: dates.totalDays,
      mtdStart: dates.sinceMTD,
      yesterday: dates.untilYday
    };

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
