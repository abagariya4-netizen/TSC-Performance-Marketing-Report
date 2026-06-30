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

function classifyFunnelExcel(cn) {
  // If Excel has Top, Mid, Bot, Group
  // What is the order of precedence?
  if (cn.includes('group')) return 'Group';
  if (cn.includes('bot')) return 'Bot';
  if (cn.includes('mid')) return 'Mid';
  if (cn.includes('top')) return 'Top';
  return 'Unknown';
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let funnels = { 'Top': 0, 'Mid': 0, 'Bot': 0, 'Group': 0, 'Unknown': 0 };
  let total = 0;

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    
    // Globally excluded adsets
    if (['boost', 'growth'].some(ex => an.includes(ex))) {
       continue;
    }

    // Exclude Growth campaigns if Excel doesn't have them?
    if (cn.includes('growth')) {
       continue; // try excluding growth
    }

    // Did Excel exclude anything else?
    // Maybe they exclude 'acce'?
    
    const spend = parseFloat(r.spend || '0');
    total += spend;
    
    const funnel = classifyFunnelExcel(cn);
    funnels[funnel] += spend;
  }

  console.log('EXCLUDING GROWTH CAMPAIGNS & ADSETS:');
  console.log(funnels);
  console.log('TOTAL:', total);
}
main().catch(console.error);
