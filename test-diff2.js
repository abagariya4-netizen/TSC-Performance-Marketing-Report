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

async function main() {
  const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-03-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${access_token}`;
  const rows = await fetchAllPages(url);

  let chairMissedByAdsetExclusion = 0;
  let mattressBotMissed = 0;

  for (const r of rows) {
    const month = r.date_start.split('-')[1];
    if (month !== '03') continue;

    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    let lc = 0;
    if (r.actions) {
      r.actions.forEach((a) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
      });
    }
    const funnel = classifyFunnel(cn);
    if (funnel === 'GROWTH') continue;

    // Check Chair Mid (4552 diff)
    if (funnel === 'MID' && cn.includes('chair')) {
      const isChairExcludedByAdset = ['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => an.includes(ex));
      if (isChairExcludedByAdset) {
        chairMissedByAdsetExclusion += lc;
        console.log(`Chair Missed by Adset Exclusion -> LC: ${lc} | Camp: ${r.campaign_name} | Adset: ${r.adset_name}`);
      }
    }

    // Check Mattress Bot (7439 diff)
    if (funnel === 'BOTTOM') {
      const isDhoniOrAll = cn.includes('dhoni') || cn.includes('all_products');
      
      let passesCurrent = false;
      if (isDhoniOrAll) {
         passesCurrent = an.includes('mat');
      } else {
         const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
         passesCurrent = cn.includes('mat') && !excludes.some(ex => cn.includes(ex));
         if (passesCurrent) {
            const adsetExcludes = ['sofa', 'desk', 'chair', 'boost', 'growth'];
            if (adsetExcludes.some(ex => an.includes(ex))) passesCurrent = false;
         }
      }

      let passesLooser = false;
      const excludesLooser = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
      passesLooser = cn.includes('mat') && !excludesLooser.some(ex => cn.includes(ex));
      if (isDhoniOrAll) passesLooser = true;

      // Current strict logic
      let passesCurrent = false;
      if (isDhoniOrAll) {
         passesCurrent = an.includes('mat');
      } else {
         const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
         passesCurrent = cn.includes('mat') && !excludes.some(ex => cn.includes(ex));
         if (passesCurrent) {
            const adsetExcludes = ['sofa', 'desk', 'chair', 'boost', 'growth'];
            if (adsetExcludes.some(ex => an.includes(ex))) passesCurrent = false;
         }
      }

      if (passesLooser && !passesCurrent) {
         mattressBotMissed += lc;
         console.log(`Mattress BOT Missed -> LC: ${lc} | Camp: ${r.campaign_name} | Adset: ${r.adset_name}`);
      }
    }
  }

  console.log(`Total Chair Missed By Adset Exclusion: ${chairMissedByAdsetExclusion}`);
  console.log(`Total Mattress Bot Missed: ${mattressBotMissed}`);
}
main().catch(console.error);
