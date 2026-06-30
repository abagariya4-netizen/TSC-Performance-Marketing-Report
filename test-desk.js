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
  if (cn.includes('bot') && !cn.includes('growth')) return 'BOTTOM';
  if (cn.includes('mid') && !cn.includes('growth')) return 'MID';
  if (!cn.includes('mid') && !cn.includes('bot')) return 'TOP';
  return null;
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions&time_increment=monthly&time_range={"since":"2024-03-01","until":"2024-03-31"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let funnels = {
    TOP: { lc: 0, lp: 0 },
    MID: { lc: 0, lp: 0 },
    BOTTOM: { lc: 0, lp: 0 },
  };

  for (const row of rows) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    
    // Check if it's Desk (elev8)
    if (!cn.includes('elev8') && !an.includes('elev8')) continue;

    const funnel = classifyFunnel(cn);
    if (!funnel || funnel === 'GROWTH') continue;

    let lc = 0, lp = 0;
    if (row.actions && Array.isArray(row.actions)) {
      row.actions.forEach((a) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
        if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
      });
    }

    funnels[funnel].lc += lc;
    funnels[funnel].lp += lp;
  }

  console.log('--- DESK (ELEV8) ---');
  for (const f of ['TOP', 'MID', 'BOTTOM']) {
    const data = funnels[f];
    const pct = data.lc === 0 ? '0.00%' : ((data.lp / data.lc) * 100).toFixed(2) + '%';
    console.log(`${f}: ${pct} (LC: ${data.lc}, LP: ${data.lp})`);
  }
}
main().catch(console.error);
