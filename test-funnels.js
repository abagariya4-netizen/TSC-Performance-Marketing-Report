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
  if (cn.includes('bot')) return 'BOT';
  if (cn.includes('mid')) return 'MID';
  if (cn.includes('top')) return 'TOP';
  if (cn.includes('group')) return 'GROUP';
  return 'UNKNOWN';
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let topSpend = 0;
  let midSpend = 0;
  let botSpend = 0;
  let groupSpend = 0;
  let growthSpend = 0;
  let otherSpend = 0;

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    
    // Globally excluded adsets
    if (['boost', 'growth'].some(ex => an.includes(ex))) {
       continue;
    }

    // How did Excel do it?
    // In Image 2, there is no "Growth". It says "Group".
    const spend = parseFloat(r.spend || '0');
    
    if (cn.includes('growth')) {
       growthSpend += spend;
    }

    if (cn.includes('group')) {
       groupSpend += spend;
    }

    if (cn.includes('bot')) botSpend += spend;
    else if (cn.includes('mid')) midSpend += spend;
    else if (cn.includes('top')) topSpend += spend;
    else otherSpend += spend;
  }

  console.log(`TOP: ${topSpend}`);
  console.log(`MID: ${midSpend}`);
  console.log(`BOT: ${botSpend}`);
  console.log(`GROUP (if 'group'): ${groupSpend}`);
  console.log(`GROWTH (if 'growth'): ${growthSpend}`);
  console.log(`OTHER (no top/mid/bot): ${otherSpend}`);
}
main().catch(console.error);
