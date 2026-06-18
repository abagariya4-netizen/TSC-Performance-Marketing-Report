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
    const n = geoData.name.toLowerCase();

    // Check if it was mapped to Bengaluru but is actually in Maharashtra!
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
        
        if (c.includes('maharashtra')) {
            console.log(`[BENGALURU LEAK] Mapped to Bng but in MH: ${c} (cost=${cost})`);
        }
    }

    // P2: Hyd Dropped
    if (c.includes('kondapur') || c.includes('nallagandla')) {
        // console.log(`[P2] Dropped from Hyd: ${c} (cost=${cost})`);
        costs.set(c, (costs.get(c)||0)+cost);
    }

    // P3: Chennai over by 245
    // Find Chennai mapped cities
    if (c === 'chennai,chennai,tamil nadu,india' || c.includes('chennai') || c.includes('padianallur')) {
        if (!c.includes('kanchipuram') && !c.includes('thiruvallur') && 
            !c.includes('guduvancheri') && !c.includes('kelambakkam')) {
            // It's Chennai. Is it search or pmax?
            if (campaignName.toLowerCase().includes('search')) {
                costs.set('chennai_search_'+c, (costs.get('chennai_search_'+c)||0)+cost);
            } else if (campaignName.toLowerCase().includes('pmax') || campaignName.toLowerCase().includes('performance max')) {
                costs.set('chennai_pmax_'+c, (costs.get('chennai_pmax_'+c)||0)+cost);
            }
        }
    }

    // P4: Delhi NCR over by 1184
    if (c.includes('delhi') || c.includes('gurugram') || c.includes('gurgaon') ||
        c.includes('noida') || c.includes('ghaziabad') ||
        c.includes('faridabad')) {
        if (!c.includes('baprola') && !c.includes('mundka')) {
           if (campaignName.toLowerCase().includes('search')) {
                costs.set('delhi_search_'+c, (costs.get('delhi_search_'+c)||0)+cost);
            } else if (campaignName.toLowerCase().includes('pmax') || campaignName.toLowerCase().includes('performance max')) {
                costs.set('delhi_pmax_'+c, (costs.get('delhi_pmax_'+c)||0)+cost);
            }
        }
    }
  }

  console.log("=== HYD DROPPED TOTALS ===");
  for(const [k,v] of costs.entries()){
      if(k.includes('kondapur') || k.includes('nallagandla')){
          console.log(`${k}: ${v}`);
      }
  }

  console.log("=== CHENNAI SEARCH ===");
  for(const [k,v] of costs.entries()){
      if(k.includes('chennai_search')){
          console.log(`${k}: ${v}`);
      }
  }

  console.log("=== CHENNAI PMAX ===");
  for(const [k,v] of costs.entries()){
      if(k.includes('chennai_pmax')){
          console.log(`${k}: ${v}`);
      }
  }

  console.log("=== DELHI SEARCH ===");
  for(const [k,v] of costs.entries()){
      if(k.includes('delhi_search')){
          console.log(`${k}: ${v}`);
      }
  }

  console.log("=== DELHI PMAX ===");
  for(const [k,v] of costs.entries()){
      if(k.includes('delhi_pmax')){
          console.log(`${k}: ${v}`);
      }
  }
}

run().catch(console.error);
