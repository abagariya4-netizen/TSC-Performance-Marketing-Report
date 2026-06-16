const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const fetch = require('node-fetch');

const token = process.env.META_ACCESS_TOKEN;
const accountId = process.env.META_AD_ACCOUNT_ID;
const timeRangeStr = encodeURIComponent(JSON.stringify({ since: '2026-05-01', until: '2026-06-15' }));
const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=campaign_name,adset_name,spend,actions,action_values&level=adset&time_range=${timeRangeStr}&limit=50&access_token=${token}`;

fetch(url).then((r: any) => r.json()).then((j: any) => {
  if (j.data) {
    const actionTypes = new Set<string>();
    j.data.forEach((d: any) => {
      if (d.action_values) {
        d.action_values.forEach((a: any) => actionTypes.add(a.action_type));
      }
    });
    console.log('Unique Action Types in action_values:', Array.from(actionTypes));
  } else {
    console.log(j);
  }
});
