import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { getDateParams } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

function getCity(canonicalName: string, cityName: string): string | null {
  const c = canonicalName.toLowerCase();
  const n = cityName.toLowerCase();

  // Delhi+NCR — check first
  if (c.includes('delhi') || n.includes('delhi') ||
      n.includes('gurugram') || n.includes('gurgaon') ||
      n.includes('noida') || n.includes('ghaziabad') ||
      n.includes('faridabad')) return 'Delhi+NCR';

  // Gujarat cities
  if (n.includes('ahmedabad') || n.includes('ahmadabad') ||
      n.includes('gandhinagar') || n.includes('surat') ||
      n.includes('rajkot') || n.includes('vadodara') ||
      n.includes('bodakdev') || n.includes('bopal') ||
      n.includes('nikol') || n.includes('maninagar') ||
      n.includes('paldi') || n.includes('athwa') ||
      n.includes('bhakti nagar')) return 'Gujarat';

  if (c.includes('mumbai') || c.includes('thane') ||
      c.includes('navi mumbai') || c.includes('kalyan') ||
      c.includes('dombivali') || c.includes('dombivli') ||
      c.includes('vasai') || c.includes('virar') ||
      c.includes('mira bhayandar') || c.includes('bhiwandi') ||
      c.includes('ambernath') || c.includes('ulhasnagar') ||
      c.includes('panvel')) return 'Mumbai';

  if (n.includes('bengaluru') || n.includes('bangalore') ||
      n.includes('koramangala') || n.includes('indiranagar') ||
      n.includes('whitefield') || n.includes('bellandur') ||
      n.includes('mahadevapura') || n.includes('marathahalli') ||
      n.includes('jayanagar') || n.includes('jp nagar') ||
      n.includes('btm') || n.includes('hebbal') ||
      n.includes('yelahanka') || n.includes('electronic city') ||
      n.includes('rajajinagar') || n.includes('malleshwaram') ||
      n.includes('basavanagudi') || n.includes('brookefield') ||
      n.includes('krishnarajapura') || n.includes('kudlu') ||
      n.includes('akshayanagar') || n.includes('rayasandra') ||
      n.includes('balagere') || n.includes('nayanda halli') ||
      n.includes('chikkakannalli') || n.includes('subramanyapura') ||
      n.includes('narayanapura') || n.includes('indirapuram')) return 'Bengaluru';

  if (n.includes('chennai') || n.includes('tambaram') ||
      n.includes('velachery') || n.includes('adyar') ||
      n.includes('anna nagar') || n.includes('t nagar') ||
      n.includes('mylapore') || n.includes('pallavaram') ||
      n.includes('sholinganallur') || n.includes('shollinganallur') ||
      n.includes('perungudi') || n.includes('medavakkam') ||
      n.includes('madipakkam') || n.includes('tharamani') ||
      n.includes('manapakkam') || n.includes('meenambakkam') ||
      n.includes('nungambakkam') || n.includes('kovilambakkam') ||
      n.includes('thiruverkadu') || n.includes('injambakkam') ||
      n.includes('korattur') || n.includes('madambakkam') ||
      n.includes('egmore') || n.includes('aminjikarai') ||
      n.includes('kanchipuram') || n.includes('thiruvallur') ||
      n.includes('george town') || n.includes('pammal') ||
      n.includes('kodungaiyur') || n.includes('kelambakkam') ||
      n.includes('guduvancheri')) return 'Chennai';

  if (n.includes('hyderabad') || n.includes('secunderabad') ||
      n.includes('sangareddy') || n.includes('serilingampalli') ||
      n.includes('malkajgiri') || n.includes('balanagar') ||
      n.includes('qutubullapur') || n.includes('saroornagar') ||
      n.includes('nizampet') || n.includes('jubilee hills') ||
      n.includes('banjara hills') || n.includes('khairtabad') ||
      n.includes('cherlapalli') || n.includes('bachupally') ||
      n.includes('manchirevula') || n.includes('bolarum') ||
      n.includes('jagathgiri') || n.includes('hastinapuram') ||
      n.includes('alwal') || n.includes('kondapur') ||
      n.includes('nallagandla') || n.includes('patan cheruvu') ||
      n.includes('nizamabad')) return 'Hyderabad';

  // Not one of the 6 cities
  return null;
}

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

export async function GET() {
  try {
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
    const cities = ['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Gujarat', 'Delhi+NCR'];

    const createCityObject = () => {
      const obj: any = {};
      campaignTypes.forEach(t => obj[t] = { mtd: 0, yesterday: 0 });
      obj.total = { mtd: 0, yesterday: 0 };
      return obj;
    };

    const result: any = { cities: {}, grandTotal: { mtd: 0, yesterday: 0 } };
    cities.forEach(city => result.cities[city] = createCityObject());

    const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf', 'chair', 'sofa', 'desk', 'elite', 'foot', 'bed', 'acce', 'pillow', 'cushion', 'massa', 'sensai', 'boost'];

    const processResults = (res: any[], timePeriod: 'mtd' | 'yesterday') => {
      for (const row of res) {
        const campaignName = row.campaign?.name || '';
        const nameLower = campaignName.toLowerCase();
        
        // 1. Check campaign exclusions
        let isExcluded = false;
        for (const ex of exclusions) {
          if (nameLower.includes(ex)) {
            isExcluded = true;
            break;
          }
        }
        if (isExcluded) continue;

        // 2. Check category filter
        if (!nameLower.includes('mat')) continue;

        // 3. Resolve geo_target_city
        const resourceName = row.segments?.geoTargetCity;
        if (!resourceName) continue;
        
        const geoData = geoMap.get(resourceName);
        if (!geoData) continue;

        // 4. Run getCity mapping
        const cityBucket = getCity(geoData.canonicalName, geoData.name);
        if (!cityBucket) continue; // Discard Not one of 6 cities

        // 5. Run classifyCampaign
        const channelType = row.campaign?.advertisingChannelType || '';
        const campType = classifyCampaign(channelType, campaignName);
        if (!campType) continue; // Discard invalid types

        const cost = parseFloat(row.metrics?.costMicros || '0') / 1000000;

        // 6. Add spend
        result.cities[cityBucket][campType][timePeriod] += cost;
        result.cities[cityBucket].total[timePeriod] += cost;
        result.grandTotal[timePeriod] += cost;
      }
    };

    processResults(geoMtdRes, 'mtd');
    processResults(geoYdayRes, 'yesterday');

    result.dateInfo = {
      monthName: dates.sinceMTD, // Could format better if needed, but keeping simple
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
