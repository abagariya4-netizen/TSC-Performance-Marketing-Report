const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || 'act_2240079932900749';
const BASE_URL = 'https://graph.facebook.com/v19.0';
const token = process.env.META_ACCESS_TOKEN;

if (!token) {
  console.error("Missing META_ACCESS_TOKEN");
  process.exit(1);
}

async function fetchAllPages(urlStr) {
  let allData = [];
  let nextUrl = urlStr;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message);
    }
    if (json.data) allData = allData.concat(json.data);
    nextUrl = json.paging && json.paging.next ? json.paging.next : null;
  }
  return allData;
}

async function run() {
  const since = '2026-03-01';
  const until = '2026-06-30';
  const timeRangeStr = encodeURIComponent(JSON.stringify({ since, until }));
  const url = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,actions&time_increment=monthly&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
  
  const data = await fetchAllPages(url);
  console.log(`Fetched ${data.length} rows`);

  // Expected Chair Mid: 54.07, 53.18, 57.19, 55.91
  
  let result = { '2026-03-01': { lc: 0, lp: 0 }, '2026-04-01': { lc: 0, lp: 0 }, '2026-05-01': { lc: 0, lp: 0 }, '2026-06-01': { lc: 0, lp: 0 } };
  
  for (const row of data) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    
    // Funnel is MID
    if (cn.includes('mid') && !cn.includes('growth')) {
      let isChair = false;
      
      const isAllProducts = cn.includes('all_products') || cn.includes('dhoni');
      
      // Let's test the Excel filter logic directly
      // If it has boost or growth it's usually excluded
      if (cn.includes('boost') || cn.includes('growth')) continue;

      // Chair rule:
      if (cn.includes('chair')) {
        isChair = true;
      }
      
      if (an.includes('_video') || an.includes('_all_asset') || an.includes(' video') || an.includes(' all asset')) {
        if (an.includes('chair')) isChair = true;
      } else {
        if (cn.includes('chair')) isChair = true;
      }

      if (isChair) {
        let lc = 0;
        let lp = 0;
        if (row.actions) {
          row.actions.forEach((a) => {
            if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
            if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
          });
        }
        
        if (result[row.date_start]) {
           result[row.date_start].lc += lc;
           result[row.date_start].lp += lp;
        }
      }
    }
  }
  
  console.log("Results with custom test logic:");
  for (const date in result) {
    const { lc, lp } = result[date];
    const pct = lc > 0 ? (lp / lc) * 100 : 0;
    console.log(`${date}: LC=${lc}, LP=${lp}, LC->LP = ${pct.toFixed(2)}%`);
  }
}

run();
