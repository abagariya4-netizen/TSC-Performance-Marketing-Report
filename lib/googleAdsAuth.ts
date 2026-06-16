export async function getGoogleAdsAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type:    'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('Failed to get Google Ads access token');
  return json.access_token;
}

export async function queryGoogleAds(gaql: string): Promise<any[]> {
  const token      = await getGoogleAdsAccessToken();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

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

  // Parse the streaming JSON response
  const results: any[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '[' || trimmed === ']') continue;
    try {
      const cleaned = trimmed.replace(/^,/, '');
      const parsed  = JSON.parse(cleaned);
      if (parsed.results) results.push(...parsed.results);
    } catch {
      // skip unparseable lines
    }
  }

  return results;
}
