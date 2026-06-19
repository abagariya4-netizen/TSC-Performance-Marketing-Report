import { cookies } from 'next/headers';

export async function getGoogleAdsAccessToken(): Promise<string> {
  let refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;

  try {
    const cookieStore = cookies();
    const overrideToken = cookieStore.get('google_refresh_token')?.value;
    if (overrideToken) {
      refreshToken = overrideToken;
    }
  } catch (e) {
    // cookies() throws an error if called outside of a Request context
    // Safe to ignore, fallback to env var
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Failed to get Google Ads access token: ${json.error_description || json.error || JSON.stringify(json)}`);
  }
  return json.access_token;
}

export async function queryGoogleAds(gaql: string, overrideCustomerId?: string): Promise<any[]> {
  const token      = await getGoogleAdsAccessToken();
  const customerId = overrideCustomerId || process.env.GOOGLE_ADS_CUSTOMER_ID!;

  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const headers: Record<string, string> = {
    'Authorization':   `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
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

  // Get the raw text first
  const text = await res.text();

  // If response is not OK, throw with the actual response body
  if (!res.ok) {
    throw new Error(`Google Ads API error ${res.status}: ${text.substring(0, 500)}`);
  }

  // Parse the JSON response
  let parsedJson;
  try {
    parsedJson = JSON.parse(text);
  } catch (e) {
    throw new Error(`Google Ads API returned invalid JSON: ${text.substring(0, 500)}`);
  }

  const results: any[] = [];
  if (Array.isArray(parsedJson)) {
    for (const chunk of parsedJson) {
      if (chunk.results) results.push(...chunk.results);
    }
  } else if (parsedJson.results) {
    results.push(...parsedJson.results);
  }

  return results;
}

export async function queryAllGoogleAdsAccounts(gaql: string): Promise<any[]> {
  const token = await getGoogleAdsAccessToken();
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '8012280596';

  // 1. Dynamically fetch all active child accounts
  const accountsRes = await fetch(`https://googleads.googleapis.com/v24/customers/${loginCustomerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      'Content-Type': 'application/json',
      'login-customer-id': loginCustomerId,
    },
    body: JSON.stringify({
      query: `SELECT customer_client.client_customer FROM customer_client WHERE customer_client.level <= 1 AND customer_client.status = 'ENABLED' AND customer_client.hidden = false`
    })
  });

  if (!accountsRes.ok) {
    const txt = await accountsRes.text();
    console.error("Failed to fetch child accounts:", txt);
    return [];
  }

  const accountsJson = await accountsRes.json();
  const accountsToQuery: string[] = [];
  
  if (Array.isArray(accountsJson)) {
    for (const chunk of accountsJson) {
      if (chunk.results) {
        for (const row of chunk.results) {
          if (row.customerClient?.clientCustomer) {
            // Extract the numerical ID from 'customers/1234567890'
            const id = row.customerClient.clientCustomer.split('/')[1];
            if (id !== loginCustomerId) {
              accountsToQuery.push(id);
            }
          }
        }
      }
    }
  }

  // Fallback to env vars if API fails to return children for some reason
  if (accountsToQuery.length === 0) {
    if (process.env.GOOGLE_ADS_CUSTOMER_ID) accountsToQuery.push(process.env.GOOGLE_ADS_CUSTOMER_ID);
    if (process.env.Google_Ads_Customer) accountsToQuery.push(process.env.Google_Ads_Customer);
  }

  // Ensure unique IDs to prevent accidental duplication
  const uniqueAccounts = Array.from(new Set(accountsToQuery));

  const allResults = await Promise.all(
    uniqueAccounts.map(acc => queryGoogleAds(gaql, acc).catch(e => {
      console.error(`Error querying account ${acc}:`, e);
      return [];
    }))
  );

  return allResults.flat();
}
