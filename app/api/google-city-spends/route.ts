import { queryGoogleAds, queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { mapGoogleCity, TSC_CITIES, GOOGLE_CITY_MAP } from '@/lib/googleCityMap';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDateParams } from '@/lib/dateUtils';

const EXCLUDED_KEYWORDS: string[] = [];

function isCampaignExcluded(name: string): boolean {
  const cn = (name || '').toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => cn.includes(kw));
}

// Cache for geo constants (city resource name → display name)
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

function aggregateByCity(rows: any[], geoMap: Record<string, string>, debugTracker?: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const campaignName = row.campaign?.name || '';
    if (isCampaignExcluded(campaignName)) continue;

    const cn = campaignName.toLowerCase();
    let bucket = '';

    const spend  = Math.round((row.metrics?.costMicros || 0) / 1_000_000);

    // Step 1: Forcefully check if the campaign name explicitly states the city
    // (This rescues missing spend from PMax campaigns that don't report locations)
    // EXCEPTION: NCR cities share campaigns, so we skip campaign name matching for them
    // and rely entirely on Step 2 (physical user location).
    const ncrCities = new Set(['Delhi', 'Noida', 'Gurgaon', 'Ghaziabad', 'Faridabad']);
    const allCityAliases = Object.keys(GOOGLE_CITY_MAP);
    
    for (const alias of allCityAliases) {
      const targetCity = GOOGLE_CITY_MAP[alias];
      if (!ncrCities.has(targetCity) && cn.includes(alias)) {
        bucket = targetCity;
        break;
      }
    }

    // Step 2: If the campaign name didn't have a city, rely on Google's physical tracker
    if (!bucket) {
      const geoResource = row.segments?.geoTargetCity || '';
      const cityDisplay = (geoMap[geoResource] || '').split(',')[0].trim().toLowerCase();
      bucket = mapGoogleCity(cityDisplay);
      
      // Update debug info only for unmapped physical locations
      if (debugTracker && spend > 0) {
        const debugKey = cityDisplay ? `Unmapped: ${cityDisplay} (${geoResource})` : `No City: Campaign ${campaignName}`;
        if (bucket === 'Rest' || bucket === 'Unknown') {
          debugTracker[debugKey] = (debugTracker[debugKey] || 0) + spend;
        }
      }
    }

    result[bucket] = (result[bucket] || 0) + spend;
  }
  return result;
}

function aggregateTotalSpend(rows: any[]): number {
  let total = 0;
  for (const row of rows) {
    const campaignName = row.campaign?.name || '';
    if (isCampaignExcluded(campaignName)) continue;
    total += Math.round((row.metrics?.costMicros || 0) / 1_000_000);
  }
  return total;
}

function getGoogleDateHelpers() {
  const today     = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const monthStart    = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
  const yesterdayStr  = fmt(yesterday);
  const totalDays     = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const daysPassed    = yesterday.getDate();
  const daysRemaining = totalDays - daysPassed;

  return { monthStart, yesterdayStr, totalDays, daysPassed, daysRemaining };
}

export async function GET() {
  // Check all required env vars exist
  const missingVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
  ].filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    return NextResponse.json({
      error: `Missing environment variables: ${missingVars.join(', ')}`
    }, { status: 500 });
  }

  try {
    const { monthStart, yesterdayStr, totalDays, daysPassed, daysRemaining } = getGoogleDateHelpers();
    const geoMap = await getGeoMap();

    // Run all 4 fetches in parallel
    const [mtdGeoRows, ydayGeoRows, mtdTotalRows, ydayTotalRows] = await Promise.all([

      // Call 1: MTD spend by city (user_location_view)
      queryAllGoogleAdsAccounts(`
        SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
        FROM user_location_view
        WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
      `),

      // Call 2: Yesterday spend by city
      queryAllGoogleAdsAccounts(`
        SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
        FROM user_location_view
        WHERE segments.date = '${yesterdayStr}'
      `),

      // Call 3: MTD total account spend (no geo breakdown) — for Unknown
      queryAllGoogleAdsAccounts(`
        SELECT campaign.name, metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
      `),

      // Call 4: Yesterday total account spend (no geo breakdown) — for Unknown
      queryAllGoogleAdsAccounts(`
        SELECT campaign.name, metrics.cost_micros
        FROM campaign
        WHERE segments.date = '${yesterdayStr}'
      `),
    ]);

    // Aggregate city-level spend
    const unmappedSpends: Record<string, number> = {};
    const mtdByCity   = aggregateByCity(mtdGeoRows,  geoMap, unmappedSpends);
    const ydayByCity  = aggregateByCity(ydayGeoRows, geoMap);

    // Total account spend (for Unknown calculation)
    const mtdTotal    = aggregateTotalSpend(mtdTotalRows);
    const ydayTotal   = aggregateTotalSpend(ydayTotalRows);

    // Grand Total of geo-attributed spend (named cities + Rest)
    // Unknown = Total account spend − Grand Total mapped cities
    const mtdMappedTotal  = Object.entries(mtdByCity).filter(([k]) => k !== 'Unknown').reduce((s, [, v]) => s + v, 0);
    const ydayMappedTotal = Object.entries(ydayByCity).filter(([k]) => k !== 'Unknown').reduce((s, [, v]) => s + v, 0);

    mtdByCity['Unknown']  = Math.max(0, mtdTotal  - mtdMappedTotal);
    ydayByCity['Unknown'] = Math.max(0, ydayTotal - ydayMappedTotal);

    // Build output rows for each TSC city
    const rows = TSC_CITIES
      .map(city => {
        const mtd       = mtdByCity[city]  || 0;
        const yesterday = ydayByCity[city] || 0;
        const estSpends = mtd + yesterday * daysRemaining;
        return { city, mtd, yesterday, estSpends, daysPassed, totalDays, daysRemaining };
      })
      .filter(r => r.mtd > 0 || r.yesterday > 0);

    // Sort debug tracker to find top unmapped spends
    const topUnmapped = Object.entries(unmappedSpends)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    return NextResponse.json({ rows, yesterdayStr, monthStart, mtdTotal, ydayTotal, daysPassed, totalDays, daysRemaining, debug: topUnmapped });

  } catch (error: any) {
    console.error('Google Ads API error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack || '',
      details: error.toString()
    }, { status: 500 });
  }
}
