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

function matchesCategoryForMetrics(campaignName, adsetName, category) {
  const lowerCamp = (campaignName || '').toLowerCase();
  const lowerAdset = (adsetName || '').toLowerCase();
  const hasDhoni = lowerCamp.includes('dhoni');
  let passesCategory = false;

  if (hasDhoni) {
    if (category === 'All' || category === 'Mattress') {
      passesCategory = lowerAdset.includes('mat');
    }
    else if (category === 'Chair') passesCategory = lowerAdset.includes('chair');
    else if (category === 'Sofa') passesCategory = lowerAdset.includes('sofa');
    else if (category === 'Desk') passesCategory = lowerAdset.includes('desk');
    else if (category === 'Elite') passesCategory = lowerAdset.includes('elite');
    else if (category === 'Foot Massager') passesCategory = lowerAdset.includes('foot');
    else if (category === 'Accessories') passesCategory = lowerAdset.includes('acce');
    else if (category === 'Bed') passesCategory = lowerAdset.includes('bed');
  } else if (category === 'All') {
    passesCategory = true;
  } else {
    if (category === 'Mattress') {
      const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
      passesCategory = lowerCamp.includes('mat') && !excludes.some(ex => lowerCamp.includes(ex));
    }
    else if (category === 'Chair') passesCategory = lowerCamp.includes('chair');
    else if (category === 'Sofa') passesCategory = lowerCamp.includes('sofa');
    else if (category === 'Desk') passesCategory = lowerCamp.includes('desk');
    else if (category === 'Elite') passesCategory = lowerCamp.includes('elite');
    else if (category === 'Foot Massager') passesCategory = lowerCamp.includes('foot');
    else if (category === 'Accessories') passesCategory = lowerCamp.includes('acce');
    else if (category === 'Bed') passesCategory = lowerCamp.includes('bed');
  }

  if (!passesCategory) return false;

  if (category === 'Mattress' || category === 'All') {
    if (['sofa', 'desk', 'chair', 'boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  } else if (category === 'Chair') {
    if (['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  } else if (category === 'Desk') {
    if (['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  } else {
    if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
  }
  return true;
}

function classifyFunnel(cn) {
  if (cn.includes('growth')) return 'GROWTH';
  if (cn.includes('bot') && !cn.includes('growth')) return 'BOTTOM';
  if (cn.includes('mid') && !cn.includes('growth')) return 'MID';
  if (!cn.includes('mid') && !cn.includes('bot')) return 'TOP';
  return null;
}

function processRows(rows, cat) {
  let funnels = {
    TOP: { lc: 0, lp: 0 },
    MID: { lc: 0, lp: 0 },
    BOTTOM: { lc: 0, lp: 0 },
  };

  for (const row of rows) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    let lc = 0, lp = 0;
    if (row.actions && Array.isArray(row.actions)) {
      row.actions.forEach((a) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
        if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
      });
    }

    if (cat === 'All') {
      if (cn.includes('dhoni') && !an.includes('mat')) continue;
      if (cn.includes('boost') || cn.includes('growth')) continue;
      if (an.includes('boost') || an.includes('growth')) continue;
    } else {
      if (!matchesCategoryForMetrics(cn, an, cat)) continue;
    }

    const funnel = classifyFunnel(cn);
    if (!funnel || funnel === 'GROWTH') continue;

    funnels[funnel].lc += lc;
    funnels[funnel].lp += lp;
  }

  const res = {};
  for (const f of ['TOP', 'MID', 'BOTTOM']) {
    const data = funnels[f];
    if (data.lc === 0) res[f] = '0.00%';
    else res[f] = ((data.lp / data.lc) * 100).toFixed(2) + '%';
  }
  return res;
}

async function runYear(year) {
  const periods = [
    { name: 'Mar', since: `${year}-03-01`, until: `${year}-03-31` },
    { name: 'Apr', since: `${year}-04-01`, until: `${year}-04-30` },
    { name: 'May', since: `${year}-05-01`, until: `${year}-05-31` },
    { name: 'Jun', since: `${year}-06-01`, until: `${year}-06-30` }
  ];

  const categories = ['All', 'Chair', 'Mattress', 'Sofa', 'Desk', 'Elite', 'Foot Massager'];

  console.log(`\n==== ${year} ====`);
  for (const period of periods) {
    console.log(`\n--- ${period.name} ---`);
    const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions&time_increment=monthly&time_range={"since":"${period.since}","until":"${period.until}"}&level=adset&limit=500&access_token=${access_token}`;
    const rows = await fetchAllPages(url);

    for (const cat of categories) {
      const res = processRows(rows, cat);
      console.log(`${cat.padEnd(14)} | TOP: ${res.TOP.padStart(6)} | MID: ${res.MID.padStart(6)} | BOT: ${res.BOTTOM.padStart(6)}`);
    }
  }
}

async function main() {
  await runYear(2023);
  await runYear(2024);
}

main().catch(console.error);
