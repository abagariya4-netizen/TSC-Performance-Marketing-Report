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

  const costs = new Map<string, number>();

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
    costs.set(c, (costs.get(c) || 0) + cost);
  }

  console.log("=== Cities near 935 ===");
  for (const [c, cost] of costs.entries()) {
      if (cost >= 934 && cost <= 936) {
          console.log(`${c}: ₹${cost.toFixed(2)}`);
      }
  }

  console.log("=== Cities near 3844 (Hyd P2) ===");
  for (const [c, cost] of costs.entries()) {
      if (cost >= 3840 && cost <= 3850) {
          console.log(`${c}: ₹${cost.toFixed(2)}`);
      }
  }

  console.log("=== Cities near 245 (Chennai P3) ===");
  for (const [c, cost] of costs.entries()) {
      if (cost >= 244 && cost <= 246) {
          console.log(`${c}: ₹${cost.toFixed(2)}`);
      }
  }

  console.log("=== Cities near 1184 (Delhi P4) ===");
  for (const [c, cost] of costs.entries()) {
      if (cost >= 1180 && cost <= 1190) {
          console.log(`${c}: ₹${cost.toFixed(2)}`);
      }
  }
}

run().catch(console.error);
