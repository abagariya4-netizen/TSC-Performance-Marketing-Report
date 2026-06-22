const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });
const url = 'https://graph.facebook.com/v19.0/act_2240079932900749/insights?fields=campaign_name,adset_name,spend,impressions,clicks,actions,action_values&breakdowns=publisher_platform,platform_position&level=adset&time_increment=monthly&time_range=' + encodeURIComponent(JSON.stringify({since:'2026-03-01',until:'2026-06-18'})) + '&limit=500&access_token=' + process.env.META_ACCESS_TOKEN;

async function run() {
  let next = url;
  let rows = 0;
  const start = Date.now();
  while(next) {
    const res = await fetch(next).then(r=>r.json());
    if (res.error) { console.log(res.error); break; }
    rows += res.data.length;
    next = res.paging && res.paging.next ? res.paging.next : null;
    console.log(`Fetched ${res.data.length} rows, total: ${rows}`);
  }
  console.log(`Took ${(Date.now()-start)/1000}s`);
}
run();
