const fs = require('fs');

fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

async function getGoogleAdsAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('Failed to get Google Ads access token');
  return json.access_token;
}

async function queryGoogleAds(gaql, overrideCustomerId) {
  const token      = await getGoogleAdsAccessToken();
  const customerId = overrideCustomerId || process.env.GOOGLE_ADS_CUSTOMER_ID;

  // Use v16 since v24 might have been a hallucination or from a different SDK
  // The system's actual script used v16 originally: "https://googleads.googleapis.com/v16/customers/..."
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const headers = {
    'Authorization':   `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type':    'application/json',
  };

  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '8012280596';
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: gaql }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google Ads API error ${res.status}: ${text.substring(0, 500)}`);
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(text);
  } catch (e) {
    throw new Error(`Google Ads API returned invalid JSON`);
  }

  const results = [];
  if (Array.isArray(parsedJson)) {
    for (const chunk of parsedJson) {
      if (chunk.results) results.push(...chunk.results);
    }
  } else if (parsedJson.results) {
    results.push(...parsedJson.results);
  }

  return results;
}

async function queryAllGoogleAdsAccounts(gaql) {
  const token = await getGoogleAdsAccessToken();
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '8012280596';

  const accountsRes = await fetch(`https://googleads.googleapis.com/v24/customers/${loginCustomerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
      'login-customer-id': loginCustomerId,
    },
    body: JSON.stringify({
      query: `SELECT customer_client.client_customer FROM customer_client WHERE customer_client.level <= 1 AND customer_client.status = 'ENABLED' AND customer_client.hidden = false`
    })
  });

  if (!accountsRes.ok) {
    console.error("Failed to fetch child accounts:", await accountsRes.text());
    return [];
  }

  const accountsJson = await accountsRes.json();
  const accountsToQuery = [];
  
  if (Array.isArray(accountsJson)) {
    for (const chunk of accountsJson) {
      if (chunk.results) {
        for (const row of chunk.results) {
          if (row.customerClient && row.customerClient.clientCustomer) {
            const id = row.customerClient.clientCustomer.split('/')[1];
            if (id !== loginCustomerId) {
              accountsToQuery.push(id);
            }
          }
        }
      }
    }
  }

  if (accountsToQuery.length === 0) {
    accountsToQuery.push(process.env.GOOGLE_ADS_CUSTOMER_ID);
  }

  const uniqueAccounts = Array.from(new Set(accountsToQuery));
  console.log("Querying accounts:", uniqueAccounts);

  const allResults = await Promise.all(
    uniqueAccounts.map(acc => queryGoogleAds(gaql, acc).catch(e => {
      console.error(`Error querying account ${acc}:`, e.message);
      return [];
    }))
  );

  return allResults.flat();
}

async function run() {
  const geoConstantsQuery = `
    SELECT geo_target_constant.name, geo_target_constant.resource_name
    FROM geo_target_constant
    WHERE geo_target_constant.country_code = 'IN'
  `;
  const geoConstantsRes = await queryAllGoogleAdsAccounts(geoConstantsQuery);
  const geoMap = new Map();
  for (const row of geoConstantsRes) {
    if (row.geoTargetConstant?.resourceName && row.geoTargetConstant?.name) {
      geoMap.set(row.geoTargetConstant.resourceName, row.geoTargetConstant.name);
    }
  }

  const query = `
    SELECT campaign.name, campaign.advertising_channel_type, metrics.cost_micros, segments.geo_target_city
    FROM geographic_view
    WHERE segments.date BETWEEN '2026-06-01' AND '2026-06-16'
  `;

  console.log("Fetching geographic_view data from all child accounts...");
  const results = await queryAllGoogleAdsAccounts(query);
  console.log(`Fetched ${results.length} geographic_view records.`);

  const GOOGLE_CITY_MAP = {
    'mumbai': 'Mumbai', 'navi mumbai': 'Mumbai', 'thane': 'Mumbai', 'dombivli': 'Mumbai', 'kalyan': 'Mumbai', 'vasai-virar': 'Mumbai', 'virar': 'Mumbai', 'mira bhayandar': 'Mumbai', 'bhiwandi': 'Mumbai', 'ambernath': 'Mumbai', 'nala sopara': 'Mumbai', 'palghar': 'Mumbai', 'panvel': 'Mumbai', 'vasai': 'Mumbai', 'vashi': 'Mumbai', 'ghansoli': 'Mumbai', 'sanpada': 'Mumbai', 'mahape': 'Mumbai', 'malad east': 'Mumbai', 'kandivali east': 'Mumbai', 'mira road east': 'Mumbai', 'seawoods': 'Mumbai', 'worli': 'Mumbai', 'ulhasnagar': 'Mumbai', 'mulund west': 'Mumbai', 'bhandup west': 'Mumbai', 'virar east': 'Mumbai', 'fort': 'Mumbai', 'jogeshwari east': 'Mumbai', 'bhayandar east': 'Mumbai', 'cbd belapur': 'Mumbai', 'rabale': 'Mumbai', 'mazgaon': 'Mumbai', 'bandra west': 'Mumbai', 'byculla': 'Mumbai', 'juhu': 'Mumbai', 'dahisar west': 'Mumbai', 'parel': 'Mumbai', 'khadakpada': 'Mumbai',
    'hyderabad': 'Hyderabad', 'secunderabad': 'Hyderabad', 'sangareddy': 'Hyderabad', 'serilingampalli': 'Hyderabad', 'malkajgiri': 'Hyderabad', 'balanagar': 'Hyderabad', 'patan cheruvu': 'Hyderabad', 'qutubullapur': 'Hyderabad', 'saroornagar': 'Hyderabad', 'nizampet': 'Hyderabad', 'jubilee hills': 'Hyderabad', 'alwal': 'Hyderabad', 'banjara hills': 'Hyderabad', 'khairtabad': 'Hyderabad', 'cherlapalli': 'Hyderabad', 'bachupally': 'Hyderabad', 'manchirevula': 'Hyderabad', 'bolarum': 'Hyderabad', 'jagathgiri gutta': 'Hyderabad', 'hastinapuram': 'Hyderabad', 'nizamabad, telangana': 'Hyderabad',
    'chennai': 'Chennai', 'shollinganallur': 'Chennai', 'mylapore': 'Chennai', 'aminjikarai': 'Chennai', 'tambaram': 'Chennai', 'pallavaram': 'Chennai', 'egmore': 'Chennai', 'kanchipuram': 'Chennai', 'thiruvallur': 'Chennai', 'velachery': 'Chennai', 'tharamani': 'Chennai', 'madipakkam': 'Chennai', 'medavakkam': 'Chennai', 'sholinganallur': 'Chennai', 'manapakkam': 'Chennai', 'george town': 'Chennai', 'meenambakkam': 'Chennai', 'madambakkam': 'Chennai', 'nungambakkam': 'Chennai', 'pammal': 'Chennai', 'kodungaiyur': 'Chennai', 'kovilambakkam': 'Chennai', 'thiruverkadu': 'Chennai', 'injambakkam': 'Chennai', 'korattur': 'Chennai',
    'bengaluru': 'Bengaluru', 'mahadevapura': 'Bengaluru', 'jayanagar': 'Bengaluru', 'brookefield': 'Bengaluru', 'krishnarajapura': 'Bengaluru', 'c v raman nagar': 'Bengaluru', 'koramangala': 'Bengaluru', 'balagere': 'Bengaluru', 'indirapuram': 'Bengaluru', 'rajajinagar': 'Bengaluru', 'bellandur': 'Bengaluru', 'nayanda halli': 'Bengaluru', 'rayasandra': 'Bengaluru', 'krishnarajapuram': 'Bengaluru', 'indiranagar': 'Bengaluru', 'subramanyapura': 'Bengaluru', 'narayanapura': 'Bengaluru', 'kudlu': 'Bengaluru', 'akshayanagar': 'Bengaluru', 'chikkakannalli': 'Bengaluru',
    'new delhi': 'Delhi+NCR', 'delhi': 'Delhi+NCR', 'civil lines': 'Delhi+NCR', 'punjabi bagh': 'Delhi+NCR', 'kalkaji': 'Delhi+NCR', 'saket': 'Delhi+NCR', 'defence colony': 'Delhi+NCR', 'saraswati vihar': 'Delhi+NCR', 'mayur vihar': 'Delhi+NCR', 'dwarka': 'Delhi+NCR', 'rajouri garden': 'Delhi+NCR', 'preet vihar': 'Delhi+NCR', 'hauz khas': 'Delhi+NCR', 'vasant vihar': 'Delhi+NCR', 'vasant kunj': 'Delhi+NCR', 'lajpat nagar': 'Delhi+NCR', 'greater kailash': 'Delhi+NCR', 'badarpur': 'Delhi+NCR', 'ashok vihar': 'Delhi+NCR', 'rama krishna puram': 'Delhi+NCR', 'mukherjee nagar': 'Delhi+NCR', 'mehrauli': 'Delhi+NCR', 'malviya nagar': 'Delhi+NCR', 'shalimar bagh': 'Delhi+NCR', 'yamuna bank': 'Delhi+NCR', 'shankar vihar': 'Delhi+NCR', 'dilshad garden': 'Delhi+NCR', 'noida': 'Delhi+NCR', 'greater noida': 'Delhi+NCR', 'dadri': 'Delhi+NCR', 'amrapali leisure valley': 'Delhi+NCR', 'sector 62': 'Delhi+NCR', 'sector 18': 'Delhi+NCR', 'amrapali dream valley': 'Delhi+NCR', 'sector 62a': 'Delhi+NCR', 'gurgaon': 'Delhi+NCR', 'gurugram': 'Delhi+NCR', 'sector 54': 'Delhi+NCR', 'faridabad': 'Delhi+NCR', 'ghaziabad': 'Delhi+NCR', 'pratap vihar': 'Delhi+NCR',
    'ahmedabad': 'Gujarat', 'gandhinagar': 'Gujarat', 'ahmadabad': 'Gujarat', 'bodakdev': 'Gujarat', 'bopal': 'Gujarat', 'paldi': 'Gujarat', 'maninagar': 'Gujarat', 'nikol': 'Gujarat', 'surat': 'Gujarat', 'athwa': 'Gujarat', 'vadodara': 'Gujarat', 'rajkot': 'Gujarat', 'bhakti nagar': 'Gujarat'
  };

  let allRows = [];
  results.forEach(row => {
    if (row.campaign && row.metrics) {
      let geoName = 'Unknown';
      if (row.segments?.geoTargetCity) {
         geoName = geoMap.get(row.segments.geoTargetCity) || 'Unknown';
      }
      
      let mappedCity = 'Rest';
      if (geoName !== 'Unknown') {
         mappedCity = GOOGLE_CITY_MAP[geoName.toLowerCase().trim()] || 'Rest';
      }

      allRows.push({
        name: row.campaign.name,
        channel: row.campaign.advertisingChannelType,
        cost: Number(row.metrics.costMicros) / 1000000,
        city: mappedCity,
        geoName: geoName
      });
    }
  });

  const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf', 'chair', 'sofa', 'desk', 'elite', 'foot', 'bed', 'acce', 'pillow', 'cushion', 'massa', 'sensai', 'boost'];
  
  let validRows = allRows.filter(c => {
    const nameStr = c.name.toLowerCase();
    if (!nameStr.includes('mat')) return false;
    for (const ex of exclusions) {
      if (nameStr.includes(ex)) return false;
    }
    return true;
  });

  const totals = { 'Mumbai': 0, 'Bengaluru': 0, 'Chennai': 0, 'Hyderabad': 0, 'Gujarat': 0, 'Delhi+NCR': 0, 'Rest': 0 };
  
  // Breakdown for Mumbai to match problem 2,3,4
  let mumSearch = 0, mumPMax = 0, mumBrand = 0, mumDGClicks = 0, mumDGVideo = 0, mumShopping = 0, mumDisplay = 0;

  validRows.forEach(row => {
    totals[row.city] += row.cost;

    if (row.city === 'Mumbai') {
      const n = row.name.toLowerCase();
      if (row.channel === 'SEARCH') {
        if (n.includes('brand')) mumBrand += row.cost;
        else mumSearch += row.cost;
      } else if (row.channel === 'PERFORMANCE_MAX') {
        mumPMax += row.cost;
      } else if (row.channel === 'DEMAND_GEN') {
        if (n.includes('click')) mumDGClicks += row.cost;
        else mumDGVideo += row.cost;
      } else if (row.channel === 'SHOPPING') {
        mumShopping += row.cost;
      } else if (row.channel === 'DISPLAY') {
        mumDisplay += row.cost;
      }
    }
  });

  console.log("=== GEOGRAPHIC_VIEW TOTALS WITH EXCLUSIONS ===");
  let grandTotal = 0;
  Object.keys(totals).forEach(k => {
    console.log(`  ${k}: ${totals[k]}`);
    if (k !== 'Rest') grandTotal += totals[k];
  });
  console.log(`Grand Total (6 cities only): ${grandTotal}`);

  console.log("\n=== MUMBAI BREAKDOWN ===");
  console.log(`Search: ${mumSearch}`);
  console.log(`PMax: ${mumPMax}`);
  console.log(`Branded: ${mumBrand}`);
  console.log(`DG Clicks: ${mumDGClicks}`);
  console.log(`DG Video: ${mumDGVideo}`);
  console.log(`Shopping: ${mumShopping}`);
  console.log(`Display: ${mumDisplay}`);
  console.log(`Total: ${totals['Mumbai']}`);

}

run().catch(console.error);
