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

  const hydMapped = new Map<string, number>();
  const chennaiMapped = new Map<string, number>();
  const delhiMapped = new Map<string, number>();
  const mumbaiMapped = new Map<string, number>();
  const maharashtraNull = new Map<string, number>();

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

    // Current logic simulation
    let mappedTo = null;

    if (c.includes('delhi') || n.includes('delhi') ||
        n.includes('gurugram') || n.includes('gurgaon') ||
        n.includes('noida') || n.includes('ghaziabad') ||
        n.includes('faridabad')) mappedTo = 'Delhi+NCR';
    else if (c.includes('mumbai') || c.includes('thane') ||
        c.includes('navi mumbai') || c.includes('kalyan') ||
        c.includes('dombivali') || c.includes('dombivli') ||
        c.includes('vasai') || c.includes('virar') ||
        c.includes('mira bhayandar') || c.includes('bhiwandi') ||
        c.includes('ambernath') || c.includes('ulhasnagar') ||
        c.includes('panvel')) mappedTo = 'Mumbai';
    else if (c.includes('chennai') || c.includes('tambaram') ||
        c.includes('velachery') || c.includes('adyar') ||
        c.includes('anna nagar') || c.includes('t nagar') ||
        c.includes('mylapore') || c.includes('pallavaram') ||
        c.includes('sholinganallur') || c.includes('shollinganallur') ||
        c.includes('perungudi') || c.includes('medavakkam') ||
        c.includes('madipakkam') || c.includes('tharamani') ||
        c.includes('manapakkam') || c.includes('meenambakkam') ||
        c.includes('nungambakkam') || c.includes('kovilambakkam') ||
        c.includes('thiruverkadu') || c.includes('injambakkam') ||
        c.includes('korattur') || c.includes('madambakkam') ||
        c.includes('egmore') || c.includes('aminjikarai') ||
        c.includes('george town') || c.includes('pammal') ||
        c.includes('kodungaiyur') || c.includes('kelambakkam') ||
        c.includes('guduvancheri') || c.includes('thiruvallur')) mappedTo = 'Chennai';
    else if (c.includes('hyderabad') || c.includes('secunderabad') ||
        c.includes('jubilee hills') || c.includes('banjara hills') ||
        c.includes('madhapur') || c.includes('gachibowli') ||
        c.includes('kondapur') || c.includes('hitec city') ||
        c.includes('kukatpally') || c.includes('miyapur') ||
        c.includes('lb nagar') || c.includes('dilsukhnagar') ||
        c.includes('uppal') || c.includes('nacharam') ||
        c.includes('alwal,') || c.includes('malkajgiri') ||
        c.includes('balanagar, telangana') || c.includes('qutubullapur') ||
        c.includes('saroornagar') || c.includes('nizampet') ||
        c.includes('serilingampalli') || c.includes('cherlapalli') ||
        c.includes('bachupally') || c.includes('manchirevula') ||
        c.includes('bolarum') || c.includes('hastinapuram') ||
        c.includes('jagathgiri') || c.includes('patan cheruvu') ||
        c.includes('nallagandla')) mappedTo = 'Hyderabad';

    if (mappedTo === 'Delhi+NCR') {
      delhiMapped.set(geoData.canonicalName, (delhiMapped.get(geoData.canonicalName) || 0) + cost);
    } else if (mappedTo === 'Mumbai') {
      mumbaiMapped.set(geoData.canonicalName, (mumbaiMapped.get(geoData.canonicalName) || 0) + cost);
    } else if (mappedTo === 'Chennai') {
      chennaiMapped.set(geoData.canonicalName, (chennaiMapped.get(geoData.canonicalName) || 0) + cost);
    } else if (mappedTo === 'Hyderabad') {
      hydMapped.set(geoData.canonicalName, (hydMapped.get(geoData.canonicalName) || 0) + cost);
    } else {
      if (c.includes('maharashtra')) {
        maharashtraNull.set(geoData.canonicalName, (maharashtraNull.get(geoData.canonicalName) || 0) + cost);
      }
    }
  }

  const printMap = (title: string, m: Map<string, number>) => {
    console.log(`\n=== ${title} ===`);
    let total = 0;
    for (const [name, cost] of Array.from(m.entries()).sort((a,b) => b[1]-a[1])) {
      console.log(`${name}: ₹${cost.toFixed(2)}`);
      total += cost;
    }
    console.log(`TOTAL: ₹${total.toFixed(2)}`);
  };

  printMap("HYDERABAD MAPPED CITIES", hydMapped);
  printMap("CHENNAI MAPPED CITIES", chennaiMapped);
  printMap("DELHI+NCR MAPPED CITIES", delhiMapped);
  printMap("MUMBAI NULL MAHARASHTRA CITIES", maharashtraNull);

}

run().catch(console.error);
