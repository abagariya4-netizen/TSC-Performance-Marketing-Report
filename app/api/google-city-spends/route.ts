import { queryGoogleAds } from '@/lib/googleAdsAuth';
import { mapGoogleCity, TSC_CITIES } from '@/lib/googleCityMap';
import { NextResponse } from 'next/server';
import { getDateParams } from '@/lib/dateUtils';

const EXCLUDED_KEYWORDS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

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

function aggregateByCity(rows: any[], geoMap: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const campaignName = row.campaign?.name || '';
    if (isCampaignExcluded(campaignName)) continue;

    const geoResource = row.segments?.geoTargetCity || '';
    const cityDisplay = (geoMap[geoResource] || '').split(',')[0].trim();

    // Empty city name → Unknown (handled separately via total - geo sum)
    // Non-empty but not in map → Rest
    // In map → named bucket
    const bucket = mapGoogleCity(cityDisplay);
    const spend  = Math.round((row.metrics?.costMicros || 0) / 1_000_000);
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
  try {
    const { monthStart, yesterdayStr, totalDays, daysPassed, daysRemaining } = getGoogleDateHelpers();
    const geoMap = await getGeoMap();

    // Run all 4 fetches in parallel
    const [mtdGeoRows, ydayGeoRows, mtdTotalRows, ydayTotalRows] = await Promise.all([

      // Call 1: MTD spend by city (geographic_view)
      queryGoogleAds(`
        SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
        FROM geographic_view
        WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
        AND geographic_view.location_type = 'CITY_OF_PRESENCE'
      `),

      // Call 2: Yesterday spend by city
      queryGoogleAds(`
        SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
        FROM geographic_view
        WHERE segments.date = '${yesterdayStr}'
        AND geographic_view.location_type = 'CITY_OF_PRESENCE'
      `),

      // Call 3: MTD total account spend (no geo breakdown) — for Unknown
      queryGoogleAds(`
        SELECT campaign.name, metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
      `),

      // Call 4: Yesterday total account spend (no geo breakdown) — for Unknown
      queryGoogleAds(`
        SELECT campaign.name, metrics.cost_micros
        FROM campaign
        WHERE segments.date = '${yesterdayStr}'
      `),
    ]);

    // Aggregate city-level spend
    const mtdByCity   = aggregateByCity(mtdGeoRows,  geoMap);
    const ydayByCity  = aggregateByCity(ydayGeoRows, geoMap);

    // Total account spend (for Unknown calculation)
    const mtdTotal    = aggregateTotalSpend(mtdTotalRows);
    const ydayTotal   = aggregateTotalSpend(ydayTotalRows);

    // Grand Total of geo-attributed spend (named cities + Rest)
    // Unknown = Total account spend − Grand Total geo-attributed
    const mtdGeoTotal  = Object.values(mtdByCity).reduce((s, v) => s + v, 0);
    const ydayGeoTotal = Object.values(ydayByCity).reduce((s, v) => s + v, 0);

    mtdByCity['Unknown']  = Math.max(0, mtdTotal  - mtdGeoTotal);
    ydayByCity['Unknown'] = Math.max(0, ydayTotal - ydayGeoTotal);

    // Build output rows for each TSC city
    const rows = TSC_CITIES
      .map(city => {
        const mtd       = mtdByCity[city]  || 0;
        const yesterday = ydayByCity[city] || 0;
        const estSpends = mtd + yesterday * daysRemaining;
        return { city, mtd, yesterday, estSpends, daysPassed, totalDays, daysRemaining };
      })
      .filter(r => r.mtd > 0 || r.yesterday > 0);

    return NextResponse.json({ rows, yesterdayStr, monthStart, mtdTotal, ydayTotal, daysPassed, totalDays, daysRemaining });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
