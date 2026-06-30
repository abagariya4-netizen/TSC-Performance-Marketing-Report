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
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,spend,impressions,actions,action_values,results&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=campaign&breakdowns=publisher_platform&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);
  
  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    if (cn.includes('asc_chair_top_funnel_core_nst')) {
        console.log(`--- ${r.publisher_platform} ---`);
        console.log('Spend:', r.spend);
        console.log('Impressions:', r.impressions);
        
        const actionVals = r.action_values || [];
        const actions = r.actions || [];
        
        const ov = parseFloat(actionVals.find((a) => a.action_type === 'omni_purchase' || a.action_type === `custom.omni_purchase`)?.value || '0');
        const lc = parseInt(actions.find((a) => a.action_type === 'link_click')?.value || '0', 10);
        
        console.log('Overall Value:', ov);
        console.log('LC:', lc);
    }
  }
}
main().catch(console.error);
