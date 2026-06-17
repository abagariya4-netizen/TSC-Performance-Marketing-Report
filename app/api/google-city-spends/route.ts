import { queryGoogleAds, queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { mapGoogleCity, TSC_CITIES, GOOGLE_CITY_MAP } from '@/lib/googleCityMap';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDateParams } from '@/lib/dateUtils';

// Based on API investigation, no exclusions should be applied to match the Grand Total
const EXCLUDED_KEYWORDS: string[] = [];

function isCampaignExcluded(name: string): boolean {
  if (EXCLUDED_KEYWORDS.length === 0) return false;
  const cn = (name || '').toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => cn.includes(kw));
}

let geoMapCache: Record<string, string> | null = null;
let geoMapCacheTime = 0;
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000;

async function getGeoMap(): Promise<Record<string, string>> {
  if (geoMapCache && Date.now() - geoMapCacheTime < GEO_CACHE_TTL) return geoMapCache;

  const rows = await queryGoogleAds(`
    SELECT geo_target_constant.name, geo_target_constant.resource_name
    FROM geo_target_constant
    WHERE geo_target_constant.country_code = 'IN'
    AND geo_target_constant.target_type = 'City'
  `);

  const map: Record<string, string> = {};
  for (const row of rows) {
    const res  = row.geoTargetConstant?.resourceName || '';
    const name = row.geoTargetConstant?.name || '';
    if (res) map[res] = name;
  }
  geoMapCache     = map;
  geoMapCacheTime = Date.now();
  return map;
}

const CAMPAIGN_CITY_KEYWORDS: Record<string, string> = {
  'mumbai': 'Mumbai', 'hyderabad': 'Hyderabad', 'chennai': 'Chennai',
  'bengaluru': 'Bengaluru', 'bangalore': 'Bengaluru', 'pune': 'Pune',
  'ahmedabad': 'Ahmedabad', 'kolkata': 'Kolkata', 'lucknow': 'Lucknow',
  'bhubaneswar': 'Bhubaneswar', 'surat': 'Surat', 'indore': 'Indore',
  'jaipur': 'Jaipur', 'visakhapatnam': 'Visakhapatnam',
  'vijayawada': 'Vijayawada', 'guntur': 'Guntur',
  'thiruvananthapuram': 'Thiruvananthapuram', 'guwahati': 'Guwahati',
  'vadodara': 'Vadodara', 'ludhiana': 'Ludhiana', 'rajkot': 'Rajkot',
  'nashik': 'Nashik', 'faridabad': 'Faridabad', 'mangaluru': 'Mangaluru',
  'ghaziabad': 'Ghaziabad', 'warangal': 'Warangal', 'kochi': 'Kochi',
  'coimbatore': 'Coimbatore', 'mysore': 'Mysore', 'mysuru': 'Mysore',
  'nagpur': 'Nagpur', 'goa': 'Goa', 'mohali': 'Mohali',
  'chandigarh': 'Chandigarh', 'patna': 'Patna', 'dehradun': 'Dehradun',
  'thrissur': 'Thrissur', 'hubballi': 'Hubballi', 'salem': 'Salem',
  'aurangabad': 'Sambhaji Nagar', 'belgaum': 'Belgaum', 'kakinada': 'Kakinada',
  'bhopal': 'Bhopal', 'kolhapur': 'Kolhapur', 'kozhikode': 'Kozhikode',
  'madurai': 'Madurai', 'kanpur': 'Kanpur', 'tiruchirappalli': 'Tiruchirappalli',
  'kota': 'Kota', 'tiruppur': 'Tiruppur', 'tirupati': 'Tirupati',
  'rajahmundry': 'Rajahmundry', 'udaipur': 'Udaipur', 'sangli': 'Sangli',
  'karimnagar': 'KarimNagar', 'ballari': 'Ballari', 'hosur': 'Hosur', 'raipur': 'Raipur',
  'delhi': 'Delhi', 'noida': 'Noida', 'gurgaon': 'Gurgaon',
};

function aggregateByCity(rows: any[], geoMap: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};

  for (const row of rows) {
    const campaignName = row.campaign?.name || '';
    if (isCampaignExcluded(campaignName)) continue;

    const cn = campaignName.toLowerCase();
    const spend = Math.round((row.metrics?.costMicros || 0) / 1_000_000);

    const geoResource = row.segments?.geoTargetCity || '';
    const cityDisplay = geoResource
      ? (geoMap[geoResource] || '').split(',')[0].trim().toLowerCase()
      : '';
    let bucket = geoResource ? mapGoogleCity(cityDisplay) : '';

    if (!bucket || bucket === 'Unknown' || bucket === 'Rest') {
      for (const [keyword, targetCity] of Object.entries(CAMPAIGN_CITY_KEYWORDS)) {
        if (cn.includes(keyword)) {
          bucket = targetCity;
          break;
        }
      }
    }

    if (!bucket) bucket = 'Unknown';

    result[bucket] = (result[bucket] || 0) + spend;
  }
  return result;
}

function aggregateTotalSpend(rows: any[]): number {
  let total = 0;
  for (const row of rows) {
    if (isCampaignExcluded(row.campaign?.name || '')) continue;
    total += Math.round((row.metrics?.costMicros || 0) / 1_000_000);
  }
  return total;
}

export async function GET(request: Request) {
  try {
    const { startDate, endDate } = getDateParams(request);
    const geoMap = await getGeoMap();

    const campGaql = `
      SELECT campaign.name, metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;
    const campRows = await queryAllGoogleAdsAccounts(campGaql);
    const grandTotal = aggregateTotalSpend(campRows);

    // Correct Data Source based on API Investigation (Formula B)
    const geoGaql = `
      SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;
    const geoRows = await queryAllGoogleAdsAccounts(geoGaql);
    const geographicViewTotal = aggregateTotalSpend(geoRows);

    // Question 4 Formula B: Unknown = campaign_total - geographic_view_total
    const trueUnknown = Math.max(0, grandTotal - geographicViewTotal);

    const cityAggregation = aggregateByCity(geoRows, geoMap);
    const namedCitiesTotal = Object.entries(cityAggregation)
      .filter(([city]) => city !== 'Unknown' && city !== 'Rest')
      .reduce((sum, [, spend]) => sum + spend, 0);

    // Question 3: Rest = Grand Total - sum of all named cities - Unknown
    const trueRest = Math.max(0, grandTotal - namedCitiesTotal - trueUnknown);

    const finalData: Record<string, number> = {};
    for (const city of TSC_CITIES) {
      finalData[city] = cityAggregation[city] || 0;
    }

    finalData['Unknown'] = trueUnknown;
    finalData['Rest']    = trueRest;

    // Optional debug tracker to prove totals
    const debugTracker = {
      campaign_total: grandTotal,
      geographic_view_total: geographicViewTotal,
      sum_named_cities: namedCitiesTotal,
      calculated_unknown: trueUnknown,
      calculated_rest: trueRest
    };

    return NextResponse.json({
      data: finalData,
      debug: debugTracker
    });

  } catch (error: any) {
    console.error('Google City Spends Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
