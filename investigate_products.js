

// since lib/googleAdsAuth.ts is TypeScript, we will use tsx to run this file.
// Wait, we can just use the queryGoogleAds from the javascript we wrote in debug_gaql_user.js to avoid tsx issues.

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
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;
  const headers = {
    'Authorization':   `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type':    'application/json',
    'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '8012280596'
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query: gaql }) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Ads API error ${res.status}: ${text.substring(0, 500)}`);
  
  let parsedJson;
  try { parsedJson = JSON.parse(text); } catch (e) { throw new Error(`Google Ads API returned invalid JSON`); }

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

  const accountsJson = await accountsRes.json();
  const accountsToQuery = [];
  if (Array.isArray(accountsJson)) {
    for (const chunk of accountsJson) {
      if (chunk.results) {
        for (const row of chunk.results) {
          if (row.customerClient && row.customerClient.clientCustomer) {
            const id = row.customerClient.clientCustomer.split('/')[1];
            if (id !== loginCustomerId) accountsToQuery.push(id);
          }
        }
      }
    }
  }
  if (accountsToQuery.length === 0) accountsToQuery.push(process.env.GOOGLE_ADS_CUSTOMER_ID);

  const allResults = await Promise.all(
    Array.from(new Set(accountsToQuery)).map(acc => queryGoogleAds(gaql, acc).catch(e => {
      console.error(`Error querying account ${acc}:`, e.message);
      return [];
    }))
  );
  return allResults.flat();
}

async function run() {
  console.log("=== QUERY A: shopping_performance_view ===");
  const queryA = `
    SELECT segments.product_title, segments.product_item_id,
    campaign.name, campaign.advertising_channel_type,
    metrics.cost_micros
    FROM shopping_performance_view
    WHERE segments.date BETWEEN '2026-06-01' AND '2026-06-16'
  `;
  try {
    const resA = await queryAllGoogleAdsAccounts(queryA);
    console.log(`Query A rows: ${resA.length}`);
    const typesA = new Set(resA.map(r => r.campaign?.advertisingChannelType));
    console.log(`Campaign types returned by Query A: ${Array.from(typesA).join(', ')}`);
    const titlesA = new Set(resA.map(r => r.segments?.productTitle));
    console.log(`Unique product titles in Query A: ${titlesA.size}`);
    
    // Sample 10 unique products with spend
    const sample = {};
    for (const r of resA) {
      const title = r.segments?.productTitle || 'UNKNOWN';
      const cost = Number(r.metrics?.costMicros || 0) / 1000000;
      if (!sample[title]) sample[title] = 0;
      sample[title] += cost;
    }
    console.log(`20 Sample Titles from A:`, Object.entries(sample).slice(0, 20));
  } catch (e) {
    console.error("Query A failed:", e.message);
  }

  console.log("\n=== QUERY B: shopping_product ===");
  const queryB = `
    SELECT shopping_product.title, shopping_product.item_id,
    campaign.name, metrics.cost_micros
    FROM shopping_product
    WHERE segments.date BETWEEN '2026-06-01' AND '2026-06-16'
  `;
  try {
    const resB = await queryAllGoogleAdsAccounts(queryB);
    console.log(`Query B rows: ${resB.length}`);
  } catch (e) {
    console.error("Query B failed:", e.message);
  }

  console.log("\n=== QUERY C: Total PMax Spend from campaign ===");
  const queryC = `
    SELECT campaign.name, campaign.advertising_channel_type,
    metrics.cost_micros
    FROM campaign
    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    AND segments.date BETWEEN '2026-06-01' AND '2026-06-16'
  `;
  try {
    const resC = await queryAllGoogleAdsAccounts(queryC);
    let totalPMaxMat = 0;
    for (const r of resC) {
      const name = (r.campaign?.name || '').toLowerCase();
      const cost = Number(r.metrics?.costMicros || 0) / 1000000;
      if (name.includes('mat')) {
        totalPMaxMat += cost;
      }
    }
    console.log(`Total PMax spend for 'mat' campaigns (Query C): ${totalPMaxMat}`);
  } catch (e) {
    console.error("Query C failed:", e.message);
  }

  console.log("\n=== QUERY C2: PMax from shopping_performance_view ===");
  const queryC2 = `
    SELECT segments.product_title, campaign.name, metrics.cost_micros
    FROM shopping_performance_view
    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    AND segments.date BETWEEN '2026-06-01' AND '2026-06-16'
  `;
  try {
    const resC2 = await queryAllGoogleAdsAccounts(queryC2);
    console.log(`Query C2 rows: ${resC2.length}`);
    let totalPMaxShoppingMat = 0;
    for (const r of resC2) {
      const name = (r.campaign?.name || '').toLowerCase();
      const cost = Number(r.metrics?.costMicros || 0) / 1000000;
      if (name.includes('mat')) {
        totalPMaxShoppingMat += cost;
      }
    }
    console.log(`Total PMax spend for 'mat' campaigns mapped to products (Query C2): ${totalPMaxShoppingMat}`);
  } catch (e) {
    console.error("Query C2 failed:", e.message);
  }
}

run().catch(console.error);
