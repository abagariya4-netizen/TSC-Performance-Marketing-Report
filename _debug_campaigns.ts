import { queryAllGoogleAdsAccounts } from './lib/googleAdsAuth';
import * as fs from 'fs';

function getCity(c: string, n: string): string | null {
  // 1. MUMBAI
  if (c.includes('mumbai') || c.includes('thane') ||
      c.includes('kalyan') || c.includes('dombivali') ||
      c.includes('dombivli') || c.includes('vasai') || 
      c.includes('virar') || c.includes('mira bhayandar') || 
      c.includes('bhiwandi') || c.includes('ambernath') || 
      c.includes('ulhasnagar') || c.includes('panvel') || 
      c.includes('nala sopara')) return 'Mumbai';

  // 2. BENGALURU
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
      n.includes('indirapuram')) return 'Bengaluru';

  // 3. CHENNAI
  if (c === 'chennai,chennai,tamil nadu,india' || c.includes('chennai') || c.includes('padianallur')) {
      if (!c.includes('kanchipuram') && !c.includes('thiruvallur') && 
          !c.includes('guduvancheri') && !c.includes('kelambakkam')) {
          return 'Chennai';
      }
  }

  // 4. HYDERABAD
  if (c.includes('hyderabad') || c.includes('secunderabad') ||
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
         return 'Hyderabad';
      }
  }

  // 5. DELHI+NCR
  if (c.includes('delhi') || c.includes('gurugram') || c.includes('gurgaon') ||
      c.includes('noida') || c.includes('ghaziabad') ||
      c.includes('faridabad')) {
      if (!c.includes('baprola') && !c.includes('mundka')) {
         return 'Delhi+NCR';
      }
  }

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

  const searchCampaigns = new Set<string>();
  const searchCampaignsWithGeo = new Set<string>();
  let out = '';
  const push = (str) => out += str + '\\n';

  // 1. List every SEARCH campaign
  for (const row of geoMtdRes) {
      const channel = row.campaign?.advertisingChannelType || '';
      if (channel !== 'SEARCH') continue;
      const cn = row.campaign?.name || '';
      searchCampaigns.add(cn);
  }

  push("=== ALL SEARCH CAMPAIGNS IN GEO_VIEW ===");
  for (const c of Array.from(searchCampaigns).sort()) {
      push(c);
  }

  // Check Hyderabad specific suburbs mapping
  const hydSuburbs = ['secunderabad', 'malkajgiri', 'balanagar', 'qutubullapur', 'saroornagar', 'nizampet', 'jubilee hills', 'alwal', 'banjara hills', 'khairtabad', 'cherlapalli', 'bachupally', 'manchirevula', 'bolarum', 'jagathgiri', 'hastinapuram', 'patan cheruvu', 'serilingampalli', 'sangareddy'];
  push("\\n=== HYDERABAD SUBURB CHECK ===");
  for (const v of geoMap.values()) {
      const c = v.canonicalName.toLowerCase();
      const n = v.name.toLowerCase();
      let matchesHydSuburb = false;
      for (const sub of hydSuburbs) {
          if (c.includes(sub) || n.includes(sub)) {
              matchesHydSuburb = true;
          }
      }
      if (matchesHydSuburb) {
          const mappedTo = getCity(c, n);
          if (mappedTo !== 'Hyderabad') {
              push(`Failed Hyd Map: ${c} (Mapped to: ${mappedTo})`);
          }
      }
  }

  // Delhi NCR specific canonical check
  const delhiCanonicalSearch = new Map<string, number>();
  const delhiCanonicalPMax = new Map<string, number>();

  for (const row of geoMtdRes) {
    const campaignName = row.campaign?.name || '';
    const channelType = row.campaign?.advertisingChannelType || '';
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

    const mappedCity = getCity(c, n);
    const mappedType = classifyCampaign(channelType, campaignName);

    if (mappedCity === 'Delhi+NCR') {
        if (mappedType === 'Search') delhiCanonicalSearch.set(c, (delhiCanonicalSearch.get(c)||0)+cost);
        if (mappedType === 'Performance Max') delhiCanonicalPMax.set(c, (delhiCanonicalPMax.get(c)||0)+cost);
    }
  }

  push("\\n=== DELHI NCR SEARCH CANONICALS ===");
  for (const [c,v] of Array.from(delhiCanonicalSearch.entries()).sort((a,b)=>b[1]-a[1])) push(`${c}: ${v.toFixed(2)}`);

  push("\\n=== DELHI NCR PMAX CANONICALS ===");
  for (const [c,v] of Array.from(delhiCanonicalPMax.entries()).sort((a,b)=>b[1]-a[1])) push(`${c}: ${v.toFixed(2)}`);

  fs.writeFileSync('campaigns_out.txt', out);
  console.log("Done");
}

run().catch(console.error);
