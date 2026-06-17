const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

async function run() {
  // 1. Get Access Token
  const tokenRes = await new Promise((resolve, reject) => {
    const postData = `client_id=${env.GOOGLE_CLIENT_ID}&client_secret=${env.GOOGLE_CLIENT_SECRET}&refresh_token=${env.GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`;
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const accessToken = tokenRes.access_token;

  // 2. Query Google Ads
  const gaql = `SELECT campaign.name, segments.geo_target_city, metrics.cost_micros FROM geographic_view WHERE segments.date = '2026-06-16' LIMIT 10`;
  const postData = JSON.stringify({ query: gaql });

  const gaRes = await new Promise((resolve, reject) => {
    const req = https.request(`https://googleads.googleapis.com/v16/customers/4115414897/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': env.GOOGLE_ADS_CUSTOMER_ID,
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log(JSON.stringify(gaRes, null, 2));
}

run().catch(console.error);
