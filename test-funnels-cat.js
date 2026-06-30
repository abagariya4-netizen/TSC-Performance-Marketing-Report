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
  if (cn.includes('group')) return 'Group';
  if (cn.includes('bot')) return 'Bot';
  if (cn.includes('mid')) return 'Mid';
  if (cn.includes('top')) return 'Top';
  return 'Unknown';
}

function matchesCategoryForMetrics(campaignName, adsetName, category) {
  const lowerCamp = (campaignName || '').toLowerCase();
  const lowerAdset = (adsetName || '').toLowerCase();

  if (category === 'All') {
    if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
    return true;
  }

  let rowCategory = 'Unknown';
  const mattressExcludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];

  if (lowerCamp.includes('chair')) {
    rowCategory = 'Chair';
  } else if (lowerCamp.includes('desk')) {
    rowCategory = 'Desk';
  } else if (lowerCamp.includes('sofa')) {
    rowCategory = 'Sofa';
  } else if (lowerCamp.includes('elite')) {
    rowCategory = 'Elite';
  } else if (lowerCamp.includes('foot')) {
    rowCategory = 'Foot Massager';
  } else if (lowerCamp.includes('mat') && !mattressExcludes.some(ex => lowerCamp.includes(ex))) {
    rowCategory = 'Mattress';
  } else if (lowerCamp.includes('dhoni') || lowerCamp.includes('all_products')) {
    if (lowerAdset.includes('chair')) rowCategory = 'Chair';
    else if (lowerAdset.includes('desk')) rowCategory = 'Desk';
    else if (lowerAdset.includes('sofa')) rowCategory = 'Sofa';
    else if (lowerAdset.includes('elite')) rowCategory = 'Elite';
    else if (lowerAdset.includes('foot')) rowCategory = 'Foot Massager';
    else rowCategory = 'Mattress';
  } else if (lowerAdset.includes('mat')) {
    rowCategory = 'Mattress';
  }

  if (rowCategory !== category) return false;
  if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  return true;
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  ['Mattress', 'Chair', 'Desk', 'Sofa'].forEach(cat => {
    let funnels = { 'Top': 0, 'Mid': 0, 'Bot': 0, 'Group': 0, 'Unknown': 0 };
    let total = 0;

    for (const r of rows) {
      const cn = (r.campaign_name || '').toLowerCase();
      const an = (r.adset_name || '').toLowerCase();
      
      if (cn.includes('growth')) continue; 
      if (!matchesCategoryForMetrics(r.campaign_name, r.adset_name, cat)) continue;

      const spend = parseFloat(r.spend || '0');
      total += spend;
      const funnel = classifyFunnelExcel(cn);
      funnels[funnel] += spend;
    }

    console.log(`--- ${cat} ---`);
    console.log(funnels);
    console.log('TOTAL:', total);
  });
}
main().catch(console.error);
