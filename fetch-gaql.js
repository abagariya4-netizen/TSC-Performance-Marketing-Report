const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});
const token = process.env.GOOGLE_REFRESH_TOKEN;
fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: 'client_id=' + process.env.GOOGLE_CLIENT_ID + '&client_secret=' + process.env.GOOGLE_CLIENT_SECRET + '&refresh_token=' + token + '&grant_type=refresh_token',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
}).then(r => r.json()).then(d => {
  fetch('https://googleads.googleapis.com/v16/customers/4115414897/googleAds:searchStream', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + d.access_token,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'login-customer-id': process.env.GOOGLE_ADS_CUSTOMER_ID
    },
    body: JSON.stringify({ query: "SELECT campaign.name, segments.geo_target_city, metrics.cost_micros FROM geographic_view WHERE segments.date = '2026-06-16' LIMIT 2" })
  }).then(r => r.json()).then(g => console.log(JSON.stringify(g, null, 2)));
});
