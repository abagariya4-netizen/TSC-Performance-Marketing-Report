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
  if (cn.includes('top')) return 'TOP';
  return null;
}

function matchesCategory(cn, an, cat) {
  const lowerCamp = (cn || '').toLowerCase();
  const lowerAdset = (an || '').toLowerCase();

  const hasDhoni = lowerCamp.includes('dhoni');

  let passesCategory = false;

  if (hasDhoni) {
    if (cat === 'All' || cat === 'Mattress') passesCategory = lowerAdset.includes('mat');
    else if (cat === 'Chair') passesCategory = lowerAdset.includes('chair');
    else if (cat === 'Sofa') passesCategory = lowerAdset.includes('sofa');
    else if (cat === 'Desk') passesCategory = lowerAdset.includes('desk');
    else if (cat === 'Elite') passesCategory = lowerAdset.includes('elite');
    else if (cat === 'Foot Massager') passesCategory = lowerAdset.includes('foot');
    else if (cat === 'Accessories') passesCategory = lowerAdset.includes('acce');
    else if (cat === 'Bed') passesCategory = lowerAdset.includes('bed');
  } else if (cat === 'All') {
    passesCategory = true;
  } else {
    if (cat === 'Mattress') {
      const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
      passesCategory = lowerCamp.includes('mat') && !excludes.some(ex => lowerCamp.includes(ex));
    }
    else if (cat === 'Chair') passesCategory = lowerCamp.includes('chair');
    else if (cat === 'Sofa') passesCategory = lowerCamp.includes('sofa');
    else if (cat === 'Desk') passesCategory = lowerCamp.includes('desk');
    else if (cat === 'Elite') passesCategory = lowerCamp.includes('elite');
    else if (cat === 'Foot Massager') passesCategory = lowerCamp.includes('foot');
    else if (cat === 'Accessories') passesCategory = lowerCamp.includes('acce');
    else if (cat === 'Bed') passesCategory = lowerCamp.includes('bed');
  }

  if (!passesCategory) return false;

  if (cat === 'Mattress' || cat === 'All') {
    if (['sofa', 'desk', 'chair', 'boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  } else if (cat === 'Chair') {
    if (['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  } else if (cat === 'Desk') {
    if (['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  } else {
    if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  }

  return true;
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-03-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  
  const rows = await fetchAllPages(url);
  
  const categories = ['All', 'Elite', 'Foot Massager', 'Desk', 'Sofa', 'Mattress', 'Chair', 'Accessories', 'Bed'];
  
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

  for (const cat of categories) {
    console.log(`\n--- ${cat.toUpperCase()} ---`);
    for (const month of ['03', '04', '05', '06']) {
      const data = results[cat][month];
      const pTop = data.TOP.lc === 0 ? '0.00%' : ((data.TOP.lp / data.TOP.lc) * 100).toFixed(2) + '%';
      const pMid = data.MID.lc === 0 ? '0.00%' : ((data.MID.lp / data.MID.lc) * 100).toFixed(2) + '%';
      const pBot = data.BOTTOM.lc === 0 ? '0.00%' : ((data.BOTTOM.lp / data.BOTTOM.lc) * 100).toFixed(2) + '%';
      console.log(`${month} | TOP: ${pTop.padEnd(6)} | MID: ${pMid.padEnd(6)} | BOT: ${pBot.padEnd(6)}`);
    }
  }
}
main().catch(console.error);
