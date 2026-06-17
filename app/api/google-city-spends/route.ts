import { NextResponse } from 'next/server';
import { queryGoogleAds, queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { GOOGLE_CITY_MAP, TSC_CITIES } from '@/lib/googleCityMap';
import { getDateParams } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dates = getDateParams();
    const CUSTOMER_ID = '0668722274';

    // STEP 8 — geoTargetConstants resolution
    const geoConstantsQuery = `
      SELECT geo_target_constant.name, geo_target_constant.resource_name
      FROM geo_target_constant
      WHERE geo_target_constant.country_code = 'IN'
    `;

    // STEP 2 — 4 parallel API calls
    const gaqlGeoMTD = `
      SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date BETWEEN '${dates.sinceMTD}' AND '${dates.untilMTD}'
    `;
    const gaqlGeoYday = `
      SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
      FROM geographic_view
      WHERE segments.date = '${dates.untilYday}'
    `;
    const gaqlCampMTD = `
      SELECT campaign.name, metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${dates.sinceMTD}' AND '${dates.untilMTD}'
    `;
    const gaqlCampYday = `
      SELECT campaign.name, metrics.cost_micros
      FROM campaign
      WHERE segments.date = '${dates.untilYday}'
    `;

    const [geoConstantsRes, geoMtdRes, geoYdayRes, campMtdRes, campYdayRes] = await Promise.all([
      queryAllGoogleAdsAccounts(geoConstantsQuery),
      queryAllGoogleAdsAccounts(gaqlGeoMTD),
      queryAllGoogleAdsAccounts(gaqlGeoYday),
      queryAllGoogleAdsAccounts(gaqlCampMTD),
      queryAllGoogleAdsAccounts(gaqlCampYday),
    ]);

    // Build geoMap: resource_name -> name
    const geoMap = new Map<string, string>();
    for (const row of geoConstantsRes) {
      const rn = row.geoTargetConstant?.resourceName;
      const name = row.geoTargetConstant?.name;
      if (rn && name) {
        geoMap.set(rn, name);
      }
    }

    // Step 4 — Calculate totals
    const sumCampaign = (res: any[]) => {
      let total = 0;
      for (const row of res) {
        total += parseFloat(row.metrics?.costMicros || '0') / 1000000;
      }
      return total;
    };

    const campaign_total_mtd = sumCampaign(campMtdRes);
    const campaign_total_yday = sumCampaign(campYdayRes);

    const cityBucketsMtd = new Map<string, number>();
    const cityBucketsYday = new Map<string, number>();

    // Initialize only named cities
    for (const city of TSC_CITIES) {
      if (city !== 'Unknown' && city !== 'Rest' && city !== 'Grand Total') {
        cityBucketsMtd.set(city, 0);
        cityBucketsYday.set(city, 0);
      }
    }

    // Process Geographic View
    const processGeo = (res: any[], cityBuckets: Map<string, number>) => {
      let geo_total = 0;
      for (const row of res) {
        const cost = parseFloat(row.metrics?.costMicros || '0') / 1000000;
        geo_total += cost;

        const resource = row.segments?.geoTargetCity;
        if (resource) {
          const humanName = geoMap.get(resource);
          if (humanName) {
            const lower = humanName.toLowerCase().trim();
            const mappedName = GOOGLE_CITY_MAP[lower];
            if (mappedName && cityBuckets.has(mappedName)) {
              cityBuckets.set(mappedName, cityBuckets.get(mappedName)! + cost);
            }
          }
        }
      }
      return geo_total;
    };

    const geo_total_mtd = processGeo(geoMtdRes, cityBucketsMtd);
    const geo_total_yday = processGeo(geoYdayRes, cityBucketsYday);

    // Step 5 — Calculate Unknown and Rest
    const Unknown_MTD = campaign_total_mtd - geo_total_mtd;
    const Unknown_Yday = campaign_total_yday - geo_total_yday;

    let named_cities_total_MTD = 0;
    let named_cities_total_Yday = 0;

    cityBucketsMtd.forEach(val => named_cities_total_MTD += val);
    cityBucketsYday.forEach(val => named_cities_total_Yday += val);

    const Rest_MTD = campaign_total_mtd - named_cities_total_MTD - Unknown_MTD;
    const Rest_Yday = campaign_total_yday - named_cities_total_Yday - Unknown_Yday;

    // Step 6 — Output format
    const finalData = [];
    for (const city of TSC_CITIES) {
      if (city !== 'Unknown' && city !== 'Rest' && city !== 'Grand Total') {
        finalData.push({
          city,
          mtd: cityBucketsMtd.get(city) || 0,
          yesterday: cityBucketsYday.get(city) || 0,
        });
      }
    }

    finalData.push({ city: 'Rest', mtd: Rest_MTD, yesterday: Rest_Yday });
    finalData.push({ city: 'Unknown', mtd: Unknown_MTD, yesterday: Unknown_Yday });

    return NextResponse.json({
      rows: finalData,
      yesterdayStr: dates.sinceYday,
      monthStart: dates.sinceMTD,
      mtdTotal: campaign_total_mtd,
      ydayTotal: campaign_total_yday,
      daysPassed: dates.daysPassed,
      totalDays: dates.totalDays,
      daysRemaining: dates.daysRemaining
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
