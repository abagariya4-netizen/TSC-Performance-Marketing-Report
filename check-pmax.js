const https = require('https');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

async function run() {
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
  const monthStart = '2026-06-01';
  const yesterdayStr = '2026-06-16';

  const gaql = `
    SELECT campaign.name, segments.geo_target_city, metrics.cost_micros
    FROM user_location_view
    WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
  `;

  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '8012280596';
  
  // We'll just fetch from the primary account or whatever we can to get a sense.
}
