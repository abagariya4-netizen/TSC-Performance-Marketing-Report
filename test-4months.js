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
  if (cn.includes('top') && !cn.includes('growth')) return 'TOP';
  return null;
}

function matchesCategory(cn, an, cat) {
  const lowerCamp = (cn || '').toLowerCase();
  const lowerAdset = (an || '').toLowerCase();

  if (cat === 'All') {
    if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
    return true;
  }

  let rowCategory = 'Unknown';
  const mattressExcludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];

  if (lowerCamp.includes('chair')) rowCategory = 'Chair';
  else if (lowerCamp.includes('desk')) rowCategory = 'Desk';
  else if (lowerCamp.includes('sofa')) rowCategory = 'Sofa';
  else if (lowerCamp.includes('elite')) rowCategory = 'Elite';
  else if (lowerCamp.includes('foot')) rowCategory = 'Foot Massager';
  else if (lowerCamp.includes('mat') && !mattressExcludes.some(ex => lowerCamp.includes(ex))) rowCategory = 'Mattress';
  else if (lowerCamp.includes('dhoni') || lowerCamp.includes('all_products')) {
    if (lowerAdset.includes('chair')) rowCategory = 'Chair';
    else if (lowerAdset.includes('desk')) rowCategory = 'Desk';
    else if (lowerAdset.includes('sofa')) rowCategory = 'Sofa';
    else if (lowerAdset.includes('elite')) rowCategory = 'Elite';
    else if (lowerAdset.includes('foot')) rowCategory = 'Foot Massager';
    else rowCategory = 'Mattress';
  } else if (lowerAdset.includes('mat')) rowCategory = 'Mattress';

  if (rowCategory !== cat) return false;

  if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;

  return true;
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-03-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  
  const rows = await fetchAllPages(url);
  
  const categories = ['All', 'Elite', 'Foot Massager', 'Desk', 'Sofa', 'Mattress', 'Chair'];
  
  const results = {};
  for (const cat of categories) {
    results[cat] = {
      '03': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} },
      '04': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} },
      '05': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} },
      '06': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} }
    };
  }

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    
    let lc = 0, lp = 0;
    if (r.actions) {
      r.actions.forEach((a) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
        if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
      });
    }

    const month = r.date_start.split('-')[1];
    if (!['03', '04', '05', '06'].includes(month)) continue;

    for (const cat of categories) {
      if (matchesCategory(cn, an, cat)) {
        const funnel = classifyFunnel(cn);
        if (funnel && funnel !== 'GROWTH') {
          results[cat][month][funnel].lc += lc;
          results[cat][month][funnel].lp += lp;
        }
      }
    }
  }

  const allCategories = ['All', 'Elite', 'Foot Massager', 'Desk', 'Sofa', 'Mattress', 'Chair'];

  for (const cat of allCategories) {
    console.log(`\n--- ${cat.toUpperCase()} (LINK CLICKS) ---`);
    for (const month of ['03', '04', '05', '06']) {
      const data = results[cat]?.[month];
      if (!data) continue;
      const lcTop = data.TOP.lc;
      const lcMid = data.MID.lc;
      const lcBot = data.BOTTOM.lc;
      console.log(`${month} | TOP: ${lcTop.toString().padEnd(6)} | MID: ${lcMid.toString().padEnd(6)} | BOT: ${lcBot.toString().padEnd(6)}`);
    }
  }
}
main().catch(console.error);
