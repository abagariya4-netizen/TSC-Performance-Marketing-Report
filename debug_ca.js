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
  const q = `SELECT conversion_action.name, conversion_action.resource_name FROM conversion_action WHERE conversion_action.status = 'ENABLED'`;
  const res = await queryAllGoogleAdsAccounts(q);
  const names = Array.from(new Set(res.map(r => r.conversionAction?.name)));
  console.log("All Names:", names);
}

run().catch(console.error);
