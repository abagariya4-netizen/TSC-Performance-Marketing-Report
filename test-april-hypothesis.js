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

function getCategory(cn, an) {
  const lowerCamp = (cn || '').toLowerCase();
  const lowerAdset = (an || '').toLowerCase();

  // Campaign-level explicit categories (Highest Priority)
  if (lowerCamp.includes('chair')) return 'Chair';
  if (lowerCamp.includes('desk')) return 'Desk';
  if (lowerCamp.includes('sofa')) return 'Sofa';
  if (lowerCamp.includes('elite')) return 'Elite';
  if (lowerCamp.includes('foot')) return 'Foot Massager';

  const isDhoniOrAll = lowerCamp.includes('dhoni') || lowerCamp.includes('all_products');
  
  // Adset-level override for Dhoni/All_Products campaigns
  if (isDhoniOrAll) {
    if (lowerAdset.includes('chair')) return 'Chair';
    if (lowerAdset.includes('desk')) return 'Desk';
    if (lowerAdset.includes('sofa')) return 'Sofa';
    if (lowerAdset.includes('elite')) return 'Elite';
    if (lowerAdset.includes('foot')) return 'Foot Massager';
    return 'Mattress'; // Default for Dhoni/All
  }

  // Fallback to Mattress if campaign has 'mat' and no other category
  const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
  if (lowerCamp.includes('mat') && !excludes.some(ex => lowerCamp.includes(ex))) {
    return 'Mattress';
  }

  // Fallback to Mattress if adset has 'mat' (like that CrossSell campaign)
  if (lowerAdset.includes('mat')) {
    return 'Mattress';
  }

  return 'Unknown';
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-04-01","until":"2026-04-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  const results = {
     Mattress: { TOP: 0, MID: 0, BOTTOM: 0 },
     Chair: { TOP: 0, MID: 0, BOTTOM: 0 },
     Desk: { TOP: 0, MID: 0, BOTTOM: 0 },
     Sofa: { TOP: 0, MID: 0, BOTTOM: 0 },
     Elite: { TOP: 0, MID: 0, BOTTOM: 0 },
     'Foot Massager': { TOP: 0, MID: 0, BOTTOM: 0 }
  };

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    let lc = 0;
    if (r.actions) {
      r.actions.forEach((a) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
      });
    }
    const funnel = classifyFunnel(cn);
    if (!funnel || funnel === 'GROWTH') continue;

    if (['boost', 'growth'].some(ex => an.includes(ex))) continue;

    const cat = getCategory(cn, an);
    if (results[cat]) {
       results[cat][funnel] += lc;
    }
  }

  console.log('April Results:');
  for (const cat of ['Mattress', 'Chair', 'Desk', 'Sofa', 'Elite', 'Foot Massager']) {
     console.log(`${cat} | TOP: ${results[cat].TOP} | MID: ${results[cat].MID} | BOT: ${results[cat].BOTTOM}`);
  }
}
main().catch(console.error);
