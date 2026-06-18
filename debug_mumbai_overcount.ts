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

  const maharashtraCities = new Map<string, number>();

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

    // Check if it maps to Mumbai in OLD logic
    const oldLogicMumbai = 
      n.includes('mumbai') || n.includes('navi mumbai') ||
      n.includes('thane') || n.includes('kalyan') ||
      n.includes('dombivli') || n.includes('vasai') ||
      n.includes('virar') || n.includes('bhiwandi') ||
      n.includes('panvel') || n.includes('vashi') ||
      n.includes('ghansoli') || n.includes('sanpada') ||
      n.includes('mahape') || n.includes('seawoods') ||
      n.includes('cbd belapur') || n.includes('rabale') ||
      n.includes('ulhasnagar') || n.includes('ambernath') ||
      n.includes('mira') || n.includes('bhayandar') ||
      n.includes('nalasopara') || n.includes('palghar') ||
      n.includes('bhandup') || n.includes('mulund') ||
      n.includes('worli') || n.includes('bandra') ||
      n.includes('juhu') || n.includes('andheri') ||
      n.includes('malad') || n.includes('kandivali') ||
      n.includes('borivali') || n.includes('dahisar') ||
      n.includes('parel') || n.includes('mazgaon') ||
      n.includes('byculla') || n.includes('fort') ||
      n.includes('jogeshwari') || n.includes('khadakpada') ||
      (c.includes('maharashtra') && !n.includes('pune') &&
      !n.includes('nashik') && !n.includes('nagpur') &&
      !n.includes('aurangabad') && !n.includes('sambhaji') &&
      !n.includes('kolhapur') && !n.includes('sangli') &&
      !n.includes('solapur'));

    const newLogicMumbai = 
      c.includes('mumbai') || c.includes('thane') || c.includes('navi mumbai') ||
      c.includes('kalyan') || c.includes('dombivali') || c.includes('dombivli') ||
      c.includes('vasai') || c.includes('virar') || c.includes('mira bhayandar') ||
      c.includes('bhiwandi') || c.includes('ambernath') || c.includes('ulhasnagar') ||
      c.includes('panvel') || 
      n.includes('mumbai') || n.includes('navi mumbai') ||
      n.includes('thane') || n.includes('kalyan') ||
      n.includes('dombivli') || n.includes('vasai') ||
      n.includes('virar') || n.includes('bhiwandi') ||
      n.includes('panvel') || n.includes('vashi') ||
      n.includes('ghansoli') || n.includes('sanpada') ||
      n.includes('mahape') || n.includes('seawoods') ||
      n.includes('cbd belapur') || n.includes('rabale') ||
      n.includes('ulhasnagar') || n.includes('ambernath') ||
      n.includes('mira') || n.includes('bhayandar') ||
      n.includes('nalasopara') || n.includes('palghar') ||
      n.includes('bhandup') || n.includes('mulund') ||
      n.includes('worli') || n.includes('bandra') ||
      n.includes('juhu') || n.includes('andheri') ||
      n.includes('malad') || n.includes('kandivali') ||
      n.includes('borivali') || n.includes('dahisar') ||
      n.includes('parel') || n.includes('mazgaon') ||
      n.includes('byculla') || n.includes('fort') ||
      n.includes('jogeshwari') || n.includes('khadakpada');

    if (oldLogicMumbai && !newLogicMumbai) {
      maharashtraCities.set(geoData.canonicalName, (maharashtraCities.get(geoData.canonicalName) || 0) + cost);
    }
  }

  let totalDiff = 0;
  console.log("Cities mapped to Mumbai by old logic but NOT new logic:");
  for (const [name, cost] of maharashtraCities.entries()) {
    console.log(`${name}: ₹${cost.toFixed(2)}`);
    totalDiff += cost;
  }
  console.log(`\nTOTAL OVERCOUNT: ₹${totalDiff.toFixed(2)}`);
}

run().catch(console.error);
