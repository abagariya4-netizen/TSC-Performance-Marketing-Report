const fs = require('fs');
const token = fs.readFileSync('.env.local', 'utf8').match(/META_ACCESS_TOKEN=(.*)/)[1];

const fetchAllPages = async (url) => {
  let allData = [];
  let currentUrl = url;

  while (currentUrl) {
    const res = await fetch(currentUrl);
    const json = await res.json();
    if (!json.data) {
      if (json.error) console.error(json.error);
      break;
    }
    allData = allData.concat(json.data);
    currentUrl = json.paging?.next || null;
  }
  return allData;
};

const periods = [
  { since: '2026-03-01', until: '2026-03-31' },
  { since: '2026-04-01', until: '2026-04-30' },
  { since: '2026-05-01', until: '2026-05-31' },
  { since: '2026-06-01', until: '2026-06-22' },
];

(async () => {
  for (const p of periods) {
    const timeRangeStr = encodeURIComponent(JSON.stringify(p));
    const url = `https://graph.facebook.com/v19.0/act_2240079932900749/insights?fields=campaign_name,adset_name,spend,actions,action_values&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
    const data = await fetchAllPages(url);
    
    let totalWalkin = 0;
    for (const row of data) {
      const actions = row.actions || [];
      const val = parseFloat(actions.find(a => a.action_type === 'cl_walk_in')?.value || '0');
      totalWalkin += val;
    }
    console.log(`Month ${p.since}: Total Walkins (cl_walk_in) = ${totalWalkin}`);
  }
})();
