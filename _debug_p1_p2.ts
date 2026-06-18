import { queryAllGoogleAdsAccounts } from './lib/googleAdsAuth';

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

  const bngMapped = new Map<string, number>();
  const hydDropped = new Map<string, number>();

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

    // Bengaluru mapped
    if (n.includes('bengaluru') || n.includes('bangalore') ||
        n.includes('koramangala') || n.includes('indiranagar') ||
        n.includes('whitefield') || n.includes('jayanagar') ||
        n.includes('marathahalli') || n.includes('malleswaram') ||
        n.includes('electronic city') || n.includes('hsr layout') ||
        n.includes('bellandur') || n.includes('btm layout') ||
        n.includes('kr puram') || n.includes('yelahanka') ||
        n.includes('banashankari') || n.includes('hebbal') ||
        n.includes('domlur') || n.includes('bommanahalli') ||
        n.includes('halasuru') || n.includes('basavanagudi') ||
        n.includes('kengeri') || n.includes('peenya') ||
        n.includes('sarjapur') || n.includes('cv raman nagar') ||
        n.includes('vijayanagar') || n.includes('mathikere') ||
        n.includes('mahadevapura') || n.includes('rr nagar') ||
        n.includes('rajajinagar') || n.includes('chikkakannalli') ||
        n.includes('subramanyapura') || n.includes('narayanapura') ||
        n.includes('indirapuram') || c.includes('nijagal') || 
        c.includes('kudlu')) {
        bngMapped.set(c, (bngMapped.get(c) || 0) + cost);
    }

    if (c.includes('kondapur') || c.includes('nallagandla')) {
        hydDropped.set(c, (hydDropped.get(c) || 0) + cost);
    }
  }

  console.log("=== BENGALURU MAPPED ===");
  for (const [c, cost] of Array.from(bngMapped.entries()).sort((a,b)=>b[1]-a[1])) {
      if (Math.abs(cost - 935) < 5 || !c.includes('karnataka')) {
         console.log(`${c}: ₹${cost.toFixed(2)}`);
      }
  }

  console.log("=== HYD DROPPED ===");
  for (const [c, cost] of Array.from(hydDropped.entries()).sort((a,b)=>b[1]-a[1])) {
      console.log(`${c}: ₹${cost.toFixed(2)}`);
  }
}
run().catch(console.error);
