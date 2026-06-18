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

  const totals = { Mumbai: 0, Bengaluru: 0, Chennai: 0, Hyderabad: 0, 'Delhi+NCR': 0 };

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

    let city = null;
    
  if (c.includes('mumbai') || c.includes('thane,') ||
      c.includes('kalyan,maharashtra') || c.includes('dombivali') ||
      c.includes('dombivli') || c.includes('vasai') || 
      c.includes('virar') || c.includes('mira bhayandar') || 
      c.includes('bhiwandi') || c.includes('ambernath') || 
      c.includes('ulhasnagar') || c.includes('panvel') || 
      c.includes('nala sopara')) city = 'Mumbai';

  else if (n.includes('bengaluru') || n.includes('bangalore') ||
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
      c.includes('kudlu')) city = 'Bengaluru';

  else if (c === 'chennai,chennai,tamil nadu,india' || c.includes('chennai') || c.includes('padianallur')) {
      if (!c.includes('kanchipuram') && !c.includes('thiruvallur') && 
          !c.includes('guduvancheri') && !c.includes('kelambakkam')) {
          city = 'Chennai';
      }
  }

  else if (c.includes('hyderabad') || c.includes('secunderabad') ||
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
      if (!c.includes('palwal') && !c.includes('choutuppal') && !c.includes('punjab')) {
         city = 'Hyderabad';
      }
  }

  else if (c.includes('delhi') || c.includes('gurugram') || c.includes('gurgaon') ||
      c.includes('noida') || c.includes('ghaziabad') ||
      c.includes('faridabad')) {
      if (!c.includes('baprola') && !c.includes('mundka')) {
         city = 'Delhi+NCR';
      }
  }

    if (city) {
        totals[city] += cost;
    }
  }

  console.log("=== CURRENT LIVE TOTALS ===");
  console.log(totals);
  
  // Also list the problem canonical_names
  console.log("Correct user totals:");
  console.log({
     Mumbai: 2102152,
     Bengaluru: 2179411,
     Chennai: 1888207,
     Hyderabad: 1611745,
     'Delhi+NCR': 1803192
  });
}
run().catch(console.error);
