import { NextResponse } from 'next/server';
import { getGoogleAdsAccessToken } from '@/lib/googleAdsAuth';
export async function GET() {
  try {
    const token = await getGoogleAdsAccessToken();
    const managerId = '8012280596';
    const url = `https://googleads.googleapis.com/v24/customers/${managerId}/googleAds:searchStream`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      'Content-Type': 'application/json',
      'login-customer-id': managerId,
    };
    const gaql = 'SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.hidden, customer_client.status FROM customer_client WHERE customer_client.level <= 1';
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query: gaql }) });
    const text = await res.text();
    return new NextResponse(text, { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
