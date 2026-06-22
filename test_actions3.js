const fs = require('fs');
const token = fs.readFileSync('.env.local', 'utf8').match(/META_ACCESS_TOKEN=(.*)/)[1];

const fetchAllPages = async (url) => {
  let allData = [];
  let currentUrl = url;

  while (currentUrl) {
    const res = await fetch(currentUrl);
    const json = await res.json();
    if (!json.data) break;
    allData = allData.concat(json.data);
    currentUrl = json.paging?.next || null;
  }
  return allData;
};

(async () => {
  const url = `https://graph.facebook.com/v19.0/act_2240079932900749/insights?fields=campaign_name,adset_name,spend,actions,action_values,conversions&level=adset&time_range={"since":"2026-06-01","until":"2026-06-22"}&limit=500&access_token=${token}`;
  const data = await fetchAllPages(url);
  
  let found = false;
  for (const row of data) {
    const jsonStr = JSON.stringify(row);
    if (jsonStr.includes('489677281790128')) {
      console.log('FOUND IN ROW:', row.campaign_name, row.adset_name);
      console.log('Actions:', row.actions?.filter(a => JSON.stringify(a).includes('489677281790128')));
      console.log('Action Values:', row.action_values?.filter(a => JSON.stringify(a).includes('489677281790128')));
      console.log('Conversions:', row.conversions?.filter(a => JSON.stringify(a).includes('489677281790128')));
      found = true;
    }
  }
  if (!found) console.log('Substring 489677281790128 was NOT found in any row for June.');
})();
