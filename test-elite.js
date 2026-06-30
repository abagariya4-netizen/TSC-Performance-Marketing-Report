const fs = require('fs');
const https = require('https');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const access_token = env.META_ACCESS_TOKEN;
const accountId = env.META_AD_ACCOUNT_ID;
const BASE = 'https://graph.facebook.com/v19.0';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function fetchAllPages(url) {
  let all = [];
  let next = url;
  while (next) {
    const res = await fetchPage(next);
    if (res.data) all = all.concat(res.data);
    next = res.paging && res.paging.next ? res.paging.next : null;
  }
  return all;
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions&time_increment=monthly&time_range={"since":"2024-03-01","until":"2024-03-31"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let eliteRows = [];
  let fmRows = [];

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    if (cn.includes('elite') || an.includes('elite')) {
      eliteRows.push(r);
    }
    if (cn.includes('foot') || an.includes('foot') || cn.includes('massager') || an.includes('massager')) {
      fmRows.push(r);
    }
  }

  console.log(`Found ${eliteRows.length} Elite rows.`);
  for (const r of eliteRows) {
    console.log(`  C: ${r.campaign_name} | A: ${r.adset_name}`);
  }

  console.log(`Found ${fmRows.length} FM rows.`);
  for (const r of fmRows) {
    console.log(`  C: ${r.campaign_name} | A: ${r.adset_name}`);
  }
}
main().catch(console.error);
