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
  
    const isDhoniOrAll = lowerCamp.includes('dhoni') || lowerCamp.includes('all_products');
  
    let passesCategory = false;
  
    if (isDhoniOrAll) {
      if (category === 'All') {
        passesCategory = true;
      } else if (category === 'Mattress') {
        passesCategory = lowerAdset.includes('mat');
      } else {
        passesCategory = false;
      }
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
  
    if (category === 'All') {
      if (['boost', 'growth'].some(ex => lowerAdset.includes(ex))) return false;
    } else if (category === 'Mattress') {
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

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  const categories = ['All', 'Chair', 'Desk', 'Elite', 'Foot Massager'];
  const expected = {
    'All': 36291728,
    'Chair': 5008329,
    'Desk': 4202119,
    'Elite': 1789565,
    'Foot Massager': 994642
  };

  for (const cat of categories) {
     let total = 0;
     for (const r of rows) {
        const cn = (r.campaign_name || '').toLowerCase();
        if (cn.includes('growth')) continue; // EXCLUDE GROWTH CAMPAIGNS!
        
        if (matchesCategoryForMetrics(r.campaign_name, r.adset_name, cat)) {
           total += parseFloat(r.spend || '0');
        }
     }
     console.log(`--- ${cat} ---`);
     console.log(`Mine: ${total}`);
     console.log(`Expected: ${expected[cat]}`);
     console.log(`Diff: ${expected[cat] - total}`);
  }
}
main().catch(console.error);
