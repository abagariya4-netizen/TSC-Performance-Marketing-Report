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
  if (cn.includes('growth')) return 'Growth';
  if (cn.includes('group')) return 'Group';
  if (cn.includes('bot')) return 'Bot';
  if (cn.includes('mid')) return 'Mid';
  if (cn.includes('top')) return 'Top';
  return 'Unknown';
}

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-06-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let chairOldTotal = 0;
  let chairNewTotal = 0;
  
  let oldFunnels = { Top: 0, Mid: 0, Bot: 0, Group: 0, Growth: 0, Unknown: 0 };
  let newFunnels = { Top: 0, Mid: 0, Bot: 0, Group: 0, Growth: 0, Unknown: 0 };

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    
    // OLD LOGIC
    let passesOld = false;
    const isDhoniOrAll = cn.includes('dhoni') || cn.includes('all_products');
    if (isDhoniOrAll) {
       passesOld = false; 
    } else {
       passesOld = cn.includes('chair');
    }
    if (passesOld) {
       if (['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => an.includes(ex))) passesOld = false;
    }

    // NEW LOGIC
    let passesNew = false;
    let rowCategory = 'Unknown';
    const mattressExcludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
    if (cn.includes('chair')) {
      rowCategory = 'Chair';
    } else if (cn.includes('desk')) {
      rowCategory = 'Desk';
    } else if (cn.includes('sofa')) {
      rowCategory = 'Sofa';
    } else if (cn.includes('elite')) {
      rowCategory = 'Elite';
    } else if (cn.includes('foot')) {
      rowCategory = 'Foot Massager';
    } else if (cn.includes('mat') && !mattressExcludes.some(ex => cn.includes(ex))) {
      rowCategory = 'Mattress';
    } else if (cn.includes('dhoni') || cn.includes('all_products')) {
      if (an.includes('chair')) rowCategory = 'Chair';
      else if (an.includes('desk')) rowCategory = 'Desk';
      else if (an.includes('sofa')) rowCategory = 'Sofa';
      else if (an.includes('elite')) rowCategory = 'Elite';
      else if (an.includes('foot')) rowCategory = 'Foot Massager';
      else rowCategory = 'Mattress';
    } else if (an.includes('mat')) {
      rowCategory = 'Mattress';
    }

    if (rowCategory === 'Chair') {
       if (!['boost', 'growth'].some(ex => an.includes(ex))) {
          passesNew = true;
       }
    }

    const spend = parseFloat(r.spend || '0');
    const funnel = classifyFunnelExcel(cn);

    if (passesOld) {
       chairOldTotal += spend;
       oldFunnels[funnel] += spend;
    }
    if (passesNew) {
       chairNewTotal += spend;
       newFunnels[funnel] += spend;
    }
  }

  console.log('--- OLD LOGIC (Chair) ---');
  console.log(oldFunnels);
  console.log('TOTAL:', chairOldTotal);
  console.log('--- NEW LOGIC (Chair) ---');
  console.log(newFunnels);
  console.log('TOTAL:', chairNewTotal);
  console.log('EXCEL EXPECTED TOTAL: 5008329');
}
main().catch(console.error);
