const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
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
    SELECT campaign.name, metrics.cost_micros 
    FROM campaign 
    WHERE segments.date BETWEEN '${monthStart}' AND '${yesterdayStr}'
    AND metrics.cost_micros > 0
  `;
  const postData = JSON.stringify({ query: gaql });

  const gaRes = await new Promise((resolve, reject) => {
    const req = https.request(`https://googleads.googleapis.com/v16/customers/4115414897/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': '4D3p-m5Jz8Q6HqV7R2S1Mw', // Let's try to pass dummy or actual token? Wait, env.GOOGLE_ADS_DEVELOPER_TOKEN is not in .env.local!
        'login-customer-id': '8316334691',
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

  console.log(gaRes);
}

// run().catch(console.error);
