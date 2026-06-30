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

function classifyFunnelExcel(cn) {
  if (cn.includes('bot')) return 'Bot';
  if (cn.includes('mid')) return 'Mid';
  return 'Top';
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,impressions,clicks,actions,action_values,results&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let m = { spend: 0, overallValue: 0, impressions: 0, lc: 0, lp: 0 };
  
  for (const row of rows) {
    const cName = row.campaign_name || '';
    const aName = row.adset_name || '';

    const cn = cName.toLowerCase();
    const an = aName.toLowerCase();

    if (cn.includes('growth')) continue;
    if (!matchesCategoryForMetrics(cName, aName, 'Chair')) continue;

    const funnelName = classifyFunnelExcel(cn);
    if (funnelName === 'Top') {
        m.spend += parseFloat(row.spend || '0');
        m.impressions += parseInt(row.impressions || '0', 10);
        const actionVals = row.action_values || [];
        const actions = row.actions || [];
        m.overallValue += parseFloat(actionVals.find((a) => a.action_type === 'omni_purchase' || a.action_type === `custom.omni_purchase`)?.value || '0');
        m.lc += parseInt(actions.find((a) => a.action_type === 'link_click')?.value || '0', 10);
        m.lp += parseInt(actions.find((a) => a.action_type === 'landing_page_view')?.value || '0', 10);
    }
  }
  
  console.log('Top Funnel Chair Metrics:');
  console.log('Spend:', m.spend);
  console.log('Overall Value:', m.overallValue);
  console.log('Overall ROAS:', m.spend > 0 ? (m.overallValue / m.spend) : 0);
  console.log('Impressions:', m.impressions);
  console.log('CPM:', (m.spend / m.impressions) * 1000);
  console.log('LC:', m.lc);
  console.log('LP:', m.lp);
  console.log('LC to LP%:', (m.lp / m.lc) * 100);
}
main().catch(console.error);
