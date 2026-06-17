require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch'); // wait, Next.js uses global fetch

async function run() {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const tokenJson = await tokenRes.json();
  const token = tokenJson.access_token;

  const res = await fetch('https://googleads.googleapis.com/v24/customers/4115414897/googleAds:searchStream', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': '8012280596',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: "SELECT campaign.name, segments.geo_target_city, metrics.cost_micros FROM geographic_view WHERE segments.date = '2026-06-15' AND geographic_view.location_type = 'LOCATION_OF_PRESENCE' LIMIT 2" })
  });

  const text = await res.text();
  console.log("RESPONSE:", text.substring(0, 500));
}
run();
