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

function classifyFunnel(cn) {
  if (cn.includes('growth')) return 'GROWTH';
  if (cn.includes('bot')) return 'BOTTOM';
  if (cn.includes('mid') && !cn.includes('growth')) return 'MID';
  if (cn.includes('top') && !cn.includes('growth')) return 'TOP';
  return null;
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-04-01","until":"2026-04-30"}&level=campaign&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  console.log('--- ALL CAMPAIGNS IN MID FUNNEL FOR APRIL ---');
  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    let lc = 0;
    if (r.actions) {
      r.actions.forEach((a) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
      });
    }
    const funnel = classifyFunnel(cn);
    if (funnel !== 'MID') continue;
    
    console.log(`${lc} | ${r.campaign_name}`);
  }
}
main().catch(console.error);
