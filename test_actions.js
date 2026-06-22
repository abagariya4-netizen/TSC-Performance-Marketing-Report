const fs = require('fs');
const token = fs.readFileSync('.env.local', 'utf8').match(/META_ACCESS_TOKEN=(.*)/)[1];
const url = 'https://graph.facebook.com/v19.0/act_2240079932900749/insights?fields=campaign_name,adset_name,spend,actions,action_values&level=adset&time_range={"since":"2026-06-01","until":"2026-06-22"}&limit=500&access_token=' + token;

fetch(url).then(r=>r.json()).then(d => {
  if (!d.data) {
    console.log("No data", d);
    return;
  }
  const allActions = d.data.flatMap(x => (x.actions || []).map(a => a.action_type));
  console.log("All unique action_types:", Array.from(new Set(allActions)));
});
