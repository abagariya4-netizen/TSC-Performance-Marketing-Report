import { queryGoogleAds, queryAllGoogleAdsAccounts, getGoogleAdsAccessToken } from '@/lib/googleAdsAuth';
import { mapGoogleCity, TSC_CITIES, GOOGLE_CITY_MAP } from '@/lib/googleCityMap';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

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

  return { monthStart, yesterdayStr, totalDays, daysPassed, daysRemaining }
}

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

async function fetchCampaignTotal(startDate: string, endDate: string): Promise<number> {
  const token = await getGoogleAdsAccessToken();
  const loginCustomerId = '8012280596';
  
  // 1. Fetch all child account IDs
  const accountsRes = await fetch(`https://googleads.googleapis.com/v24/customers/${loginCustomerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      'Content-Type': 'application/json',
      'login-customer-id': loginCustomerId,
    },
    body: JSON.stringify({
      query: `SELECT customer_client.client_customer FROM customer_client WHERE customer_client.level <= 1 AND customer_client.status = 'ENABLED' AND customer_client.hidden = false`
    })
  });
  
  if (!accountsRes.ok) return 0;
  const accountsJson = await accountsRes.json();
  const accountsToQuery: string[] = [];
  
  if (Array.isArray(accountsJson)) {
    for (const chunk of accountsJson) {
      if (chunk.results) {
        for (const row of chunk.results) {
          if (row.customerClient?.clientCustomer) {
            const id = row.customerClient.clientCustomer.split('/')[1];
            if (id !== loginCustomerId) accountsToQuery.push(id);
          }
        }
      }
    }
  }

  // 2 & 3. For each child account ID, fetch campaign spend
  const uniqueAccounts = Array.from(new Set(accountsToQuery));
  let grandTotal = 0;
  
  await Promise.all(uniqueAccounts.map(async (acc) => {
    try {
      const res = await fetch(`https://googleads.googleapis.com/v24/customers/${acc}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          'Content-Type': 'application/json',
          'login-customer-id': loginCustomerId,
        },
        body: JSON.stringify({
          query: `SELECT metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`
        })
      });
      
      if (!res.ok) return;
      
      const parsed = await res.json();
      if (Array.isArray(parsed)) {
        for (const chunk of parsed) {
          if (chunk.results) {
            for (const row of chunk.results) {
              grandTotal += Math.round((row.metrics?.costMicros || 0) / 1_000_000);
            }
          }
        }
      } else if (parsed.results) {
        for (const row of parsed.results) {
          grandTotal += Math.round((row.metrics?.costMicros || 0) / 1_000_000);
        }
      }
    } catch (e) {
      console.error(`Error querying account ${acc} for campaign total:`, e);
    }
  }));

  return grandTotal;
}

export async function GET() {
  const missingVars = [
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID',
  ].filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    return NextResponse.json({
      error: `Missing environment variables: ${missingVars.join(', ')}`
    }, { status: 500 });
  }

  try {
    const { monthStart, yesterdayStr, totalDays, daysPassed, daysRemaining } = getGoogleDateHelpers();
    const geoMap = await getGeoMap();

    const [mtdGeoRows, ydayGeoRows, mtdGrandTotal, ydayGrandTotal] = await Promise.all([
      // 1. MTD mapped cities (geographic_view)
      queryAllGoogleAdsAccounts(`
        SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
        FROM geographic_view
        WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
      `),
      // 2. Yesterday mapped cities (geographic_view)
      queryAllGoogleAdsAccounts(`
        SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
        FROM geographic_view
        WHERE segments.date = '${yesterdayStr}'
      `),
      // 3. MTD Campaign Total
      fetchCampaignTotal(monthStart, yesterdayStr),
      // 4. Yesterday Campaign Total
      fetchCampaignTotal(yesterdayStr, yesterdayStr)
    ]);

    const mtdGeoTotal = aggregateTotalSpend(mtdGeoRows);
    const ydayGeoTotal = aggregateTotalSpend(ydayGeoRows);

    const mtdUnknown = Math.max(0, mtdGrandTotal - mtdGeoTotal);
    const ydayUnknown = Math.max(0, ydayGrandTotal - ydayGeoTotal);

    const mtdCityAggregation = aggregateByCity(mtdGeoRows, geoMap);
    const ydayCityAggregation = aggregateByCity(ydayGeoRows, geoMap);

    const mtdNamedCitiesTotal = Object.entries(mtdCityAggregation)
      .filter(([city]) => city !== 'Unknown' && city !== 'Rest')
      .reduce((sum, [, spend]) => sum + spend, 0);
      
    const ydayNamedCitiesTotal = Object.entries(ydayCityAggregation)
      .filter(([city]) => city !== 'Unknown' && city !== 'Rest')
      .reduce((sum, [, spend]) => sum + spend, 0);

    const mtdRest = Math.max(0, mtdGrandTotal - mtdNamedCitiesTotal - mtdUnknown);
    const ydayRest = Math.max(0, ydayGrandTotal - ydayNamedCitiesTotal - ydayUnknown);

    const rows: { city: string; mtd: number; yesterday: number }[] = [];

    for (const city of TSC_CITIES) {
      rows.push({
        city,
        mtd: mtdCityAggregation[city] || 0,
        yesterday: ydayCityAggregation[city] || 0
      });
    }

    rows.push({ city: 'Unknown', mtd: mtdUnknown, yesterday: ydayUnknown });
    rows.push({ city: 'Rest', mtd: mtdRest, yesterday: ydayRest });

    return NextResponse.json({
      rows,
      yesterdayStr,
      monthStart,
      mtdTotal: mtdGrandTotal,
      ydayTotal: ydayGrandTotal,
      daysPassed,
      totalDays,
      daysRemaining,
      debug: {
        mtdGrandTotal, mtdGeoTotal, mtdNamedCitiesTotal, mtdUnknown, mtdRest
      }
    });

  } catch (error: any) {
    console.error('Google City Spends Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack || '',
      details: error.toString()
    }, { status: 500 });
  }
}
