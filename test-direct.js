require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function run() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const since = '2024-03-01';
  const until = '2024-06-30';
  const BASE = 'https://graph.facebook.com/v19.0';
  const monthUrl = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&level=adset&limit=500&access_token=${token}`;

  console.log("Fetching...");
  let rows = [];
  let url = monthUrl;
  const delay = ms => new Promise(r => setTimeout(r, ms));
  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return console.error(data.error);
    rows = rows.concat(data.data);
    url = data.paging?.next || null;
    if (url) await delay(1000);
  }
  console.log("Got", rows.length, "rows.");

  const periods = ['2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'];
  
  function testLogic(excludeExtra) {
    const res = { TOP: {}, MID: {}, BOTTOM: {} };
    for (const row of rows) {
      const cn = (row.campaign_name || '').toLowerCase();
      const an = (row.adset_name || '').toLowerCase();
      
      // Dhoni rule
      if (cn.includes('dhoni') && !an.includes('mat')) continue;
      
      // Standard All rule
      if (cn.includes('boost') || cn.includes('growth')) continue;
      if (an.includes('boost') || an.includes('growth')) continue;

      // Experimental Extra Exclusions
      if (excludeExtra && ['chair', 'desk', 'sofa'].some(kw => an.includes(kw))) continue;

      // Funnel
      let funnel = null;
      if (cn.includes('group') || cn.includes('rnf')) funnel = 'EXCLUDED';
      else if (cn.includes('growth')) funnel = 'GROWTH';
      else if (cn.includes('bot') && !cn.includes('growth')) funnel = 'BOTTOM';
      else if (cn.includes('mid') && !cn.includes('growth')) funnel = 'MID';
      else if (!cn.includes('mid') && !cn.includes('bot')) funnel = 'TOP';

      if (!funnel || funnel === 'GROWTH' || funnel === 'EXCLUDED') continue;

      const p = row.date_start;
      if (!res[funnel][p]) res[funnel][p] = { lc: 0, lp: 0 };

      if (row.actions) {
        for (const a of row.actions) {
          if (a.action_type === 'link_click') res[funnel][p].lc += parseInt(a.value);
          if (a.action_type === 'landing_page_view') res[funnel][p].lp += parseInt(a.value);
        }
      }
    }

    console.log(excludeExtra ? "WITH EXTRA EXCLUSIONS (elite, foot, acce)" : "STANDARD LOGIC");
    for (const f of ['TOP', 'MID', 'BOTTOM']) {
      let str = f.padEnd(8) + " | ";
      for (const p of periods) {
        const stats = res[f][p];
        if (stats && stats.lc > 0) {
          str += ((stats.lp / stats.lc) * 100).toFixed(2) + "% | ";
        } else {
          str += "  N/A  | ";
        }
      }
      console.log(str);
    }
  }

  testLogic(false);
  testLogic(true);
}
run();
