import { queryAllGoogleAdsAccounts } from './lib/googleAdsAuth';
import * as fs from 'fs';

async function run() {
  const dates = { sinceMTD: '2026-06-01', untilYday: '2026-06-16' };
  const gaqlGeoMTD = `
    SELECT campaign.name, campaign.advertising_channel_type, segments.geo_target_city, metrics.cost_micros
    FROM geographic_view
    WHERE segments.date BETWEEN '${dates.sinceMTD}' AND '${dates.untilYday}'
  `;

  const geoConstantsQuery = `
    SELECT geo_target_constant.name, geo_target_constant.resource_name, geo_target_constant.canonical_name
    FROM geo_target_constant
    WHERE geo_target_constant.country_code = 'IN'
  `;

  const [geoConstantsRes, geoMtdRes] = await Promise.all([
    queryAllGoogleAdsAccounts(geoConstantsQuery),
    queryAllGoogleAdsAccounts(gaqlGeoMTD)
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

  const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf', 'chair', 'sofa', 'desk', 'elite', 'foot', 'bed', 'acce', 'pillow', 'cushion', 'massa', 'sensai', 'boost'];

  const hydCities = new Map<string, number>();
  const chennaiShoppingCities = new Map<string, number>();

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

  for (const row of geoMtdRes) {
    const campaignName = row.campaign?.name || '';
    const nameLower = campaignName.toLowerCase();
    
    let isExcluded = false;
    for (const ex of exclusions) {
      if (nameLower.includes(ex)) { isExcluded = true; break; }
    }
    if (isExcluded) continue;

    if (!nameLower.includes('mat')) continue;

    const resourceName = row.segments?.geoTargetCity;
    if (!resourceName) continue;
    
    const geoData = geoMap.get(resourceName);
    if (!geoData) continue;

    const cost = parseFloat(row.metrics?.costMicros || '0') / 1000000;
    if (cost === 0) continue;

    const c = geoData.canonicalName.toLowerCase();
    const n = geoData.name.toLowerCase();

    // Hyderabad logic
    const oldLogicHyd = 
      n.includes('hyderabad') || n.includes('secunderabad') ||
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
      n.includes('nizamabad');

    if (oldLogicHyd) {
      hydCities.set(geoData.canonicalName, (hydCities.get(geoData.canonicalName) || 0) + cost);
    }

    // Chennai logic
    const oldLogicChennai = 
      n.includes('chennai') || n.includes('tambaram') ||
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
      n.includes('guduvancheri');

    if (oldLogicChennai) {
      const channelType = row.campaign?.advertisingChannelType || '';
      const campType = classifyCampaign(channelType, campaignName);
      if (campType === 'Shopping') {
        chennaiShoppingCities.set(geoData.canonicalName, (chennaiShoppingCities.get(geoData.canonicalName) || 0) + cost);
      }
    }
  }

  console.log("=== HYDERABAD MAPPED CITIES ===");
  let hydTotal = 0;
  for (const [name, cost] of Array.from(hydCities.entries()).sort((a,b) => b[1]-a[1])) {
    console.log(`${name}: ₹${cost.toFixed(2)}`);
    hydTotal += cost;
  }
  console.log(`TOTAL HYDERABAD SPEND: ₹${hydTotal.toFixed(2)}\n`);

  console.log("=== CHENNAI SHOPPING CITIES ===");
  let chennaiTotal = 0;
  for (const [name, cost] of Array.from(chennaiShoppingCities.entries()).sort((a,b) => b[1]-a[1])) {
    console.log(`${name}: ₹${cost.toFixed(2)}`);
    chennaiTotal += cost;
  }
  console.log(`TOTAL CHENNAI SHOPPING SPEND: ₹${chennaiTotal.toFixed(2)}\n`);
}

run().catch(console.error);
