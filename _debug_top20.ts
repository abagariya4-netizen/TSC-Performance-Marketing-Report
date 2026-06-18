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

  // Data structures for tracking
  const cityTotals = { Mumbai: 0, Bengaluru: 0, Chennai: 0, Hyderabad: 0, 'Delhi+NCR': 0 };
  const citySpends = {
     Mumbai: new Map<string, number>(),
     Bengaluru: new Map<string, number>(),
     Chennai: new Map<string, number>(),
     Hyderabad: new Map<string, number>(),
     'Delhi+NCR': new Map<string, number>()
  };

  // specific sub-campaign tracking
  const bngBrandedSearch = new Map<string, number>();
  const chennaiDGVideo = new Map<string, number>();
  const chennaiPMax = new Map<string, number>();
  const delhiSearch = new Map<string, number>();
  const delhiPMax = new Map<string, number>();
  const mumbaiSearch = new Map<string, number>();

  const ALL_CITIES_SPENDS = new Map<string, number>();

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

    ALL_CITIES_SPENDS.set(c, (ALL_CITIES_SPENDS.get(c) || 0) + cost);

    let mappedTo = null;

    if (c.includes('mumbai') || c.includes('thane') ||
      c.includes('kalyan') || c.includes('dombivali') ||
      c.includes('dombivli') || c.includes('vasai') || 
      c.includes('virar') || c.includes('mira bhayandar') || 
      c.includes('bhiwandi') || c.includes('ambernath') || 
      c.includes('ulhasnagar') || c.includes('panvel') || 
      c.includes('nala sopara')) {
      mappedTo = 'Mumbai';
    } else if (n.includes('bengaluru') || n.includes('bangalore') ||
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
      mappedTo = 'Bengaluru';
    } else if (c === 'chennai,chennai,tamil nadu,india' || c.includes('chennai')) {
      if (!c.includes('kanchipuram') && !c.includes('thiruvallur') && 
          !c.includes('guduvancheri') && !c.includes('kelambakkam')) {
          mappedTo = 'Chennai';
      }
    } else if (c.includes('hyderabad') || c.includes('secunderabad') ||
      c.includes('jubilee hills') || c.includes('banjara hills') ||
      c.includes('madhapur') || c.includes('gachibowli') ||
      c.includes('hitec city') || c.includes('kukatpally') || 
      c.includes('miyapur') || c.includes('lb nagar') || 
      c.includes('dilsukhnagar') || c.includes('uppal') || 
      c.includes('nacharam') || c.includes('alwal,') || 
      c.includes('malkajgiri') || c.includes('balanagar, telangana') || 
      c.includes('qutubullapur') || c.includes('saroornagar') || 
      c.includes('nizampet') || c.includes('serilingampalli') || 
      c.includes('cherlapalli') || c.includes('bachupally') || 
      c.includes('manchirevula') || c.includes('bolarum') || 
      c.includes('hastinapuram') || c.includes('jagathgiri') || 
      c.includes('patan cheruvu')) {
      if (!c.includes('palwal') && !c.includes('choutuppal') && !c.includes('punjab') && !c.includes('kondapur')) {
         mappedTo = 'Hyderabad';
      }
    } else if (c.includes('delhi') || c.includes('gurugram') || c.includes('gurgaon') ||
      c.includes('noida') || c.includes('ghaziabad') ||
      c.includes('faridabad')) {
      mappedTo = 'Delhi+NCR';
    }

    if (mappedTo) {
       cityTotals[mappedTo] += cost;
       const map = citySpends[mappedTo] as Map<string, number>;
       map.set(c, (map.get(c) || 0) + cost);

       if (mappedTo === 'Bengaluru' && nameLower.includes('search') && nameLower.includes('branded')) {
           bngBrandedSearch.set(c, (bngBrandedSearch.get(c)||0)+cost);
       }
       if (mappedTo === 'Chennai' && nameLower.includes('demand gen') && nameLower.includes('video')) {
           chennaiDGVideo.set(c, (chennaiDGVideo.get(c)||0)+cost);
       }
       if (mappedTo === 'Chennai' && (nameLower.includes('pmax') || nameLower.includes('performance max'))) {
           chennaiPMax.set(c, (chennaiPMax.get(c)||0)+cost);
       }
       if (mappedTo === 'Delhi+NCR' && nameLower.includes('search')) {
           delhiSearch.set(c, (delhiSearch.get(c)||0)+cost);
       }
       if (mappedTo === 'Delhi+NCR' && (nameLower.includes('pmax') || nameLower.includes('performance max'))) {
           delhiPMax.set(c, (delhiPMax.get(c)||0)+cost);
       }
       if (mappedTo === 'Mumbai' && nameLower.includes('search')) {
           mumbaiSearch.set(c, (mumbaiSearch.get(c)||0)+cost);
       }
    }
  }

  let out = '';
  const push = (str) => out += str + '\\n';

  push("=== TOP 20 CANONICAL NAMES PER CITY ===");
  for (const city of Object.keys(citySpends)) {
      push(`\\n--- ${city} (Total: ₹${cityTotals[city].toFixed(2)}) ---`);
      const map = citySpends[city];
      const sorted = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 20);
      for (const [c, v] of sorted) {
          push(`${c}: ₹${v.toFixed(2)}`);
      }
  }

  push("\\n=== SPECIFIC INVESTIGATIONS ===");
  push("\\nBENGALURU BRANDED SEARCH (Over by 674):");
  for (const [c, v] of Array.from(bngBrandedSearch.entries()).sort((a,b)=>b[1]-a[1])) {
      if (v > 100) push(`${c}: ₹${v.toFixed(2)}`);
  }

  push("\\nCHENNAI DG VIDEO (Under by 227):");
  push("To find the missing, searching all TN cities for DG video...");
  // Not implemented in loop, but we can look for missing ones in ALL_CITIES

  push("\\nDELHI SEARCH (Over by 419):");
  for (const [c, v] of Array.from(delhiSearch.entries()).sort((a,b)=>b[1]-a[1])) {
       push(`${c}: ₹${v.toFixed(2)}`);
  }

  push("\\nDELHI PMAX (Over by 553):");
  for (const [c, v] of Array.from(delhiPMax.entries()).sort((a,b)=>b[1]-a[1])) {
       push(`${c}: ₹${v.toFixed(2)}`);
  }
  
  fs.writeFileSync('top20_out.txt', out);
  console.log("Done");
}

run().catch(console.error);
