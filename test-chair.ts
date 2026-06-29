import { fetchAllPages } from './lib/metaApi.ts';

const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || 'act_2240079932900749';
const BASE_URL = 'https://graph.facebook.com/v19.0';
const token = process.env.META_ACCESS_TOKEN;

if (!token) {
  console.error("Missing META_ACCESS_TOKEN");
  process.exit(1);
}

async function run() {
  const since = '2026-03-01';
  const until = '2026-06-30';
  const timeRangeStr = encodeURIComponent(JSON.stringify({ since, until }));
  const url = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,actions&time_increment=monthly&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
  
  const data = await fetchAllPages(url);
  console.log(`Fetched ${data.length} rows`);

  // We want to match Chair Mid funnel exactly: 54.07%, 53.18%, 57.19%, 55.91%
  // Let's print all Mid Funnel rows that could possibly be Chair
  
  let result: any = { '2026-03-01': { lc: 0, lp: 0 }, '2026-04-01': { lc: 0, lp: 0 }, '2026-05-01': { lc: 0, lp: 0 }, '2026-06-01': { lc: 0, lp: 0 } };
  
  // Let's try the strict old rules for campaign filtering but without completely blocking all_products
  
  for (const row of data) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    
    // Funnel is MID
    if (cn.includes('mid') && !cn.includes('growth')) {
      // Is it Chair?
      let isChair = false;
      
      const isAllProducts = cn.includes('all_products') || cn.includes('dhoni');
      
      // Let's apply a flexible rule:
      if (cn.includes('boost') || cn.includes('growth')) continue; // exclude
      
      // If the campaign explicitly says 'chair', it's chair
      if (cn.includes('chair')) {
        isChair = true;
      }
      
      // If it's an all_products campaign, and adset says chair
      if (isAllProducts && an.includes('chair')) {
        isChair = true;
      }
      
      // What if it's not all_products, but adset has chair?
      // E.g., maybe 'mid' campaigns without 'chair' or 'all_products' in name?
      if (!isChair && an.includes('chair') && !cn.includes('mat') && !cn.includes('desk') && !cn.includes('sofa')) {
          isChair = true;
      }

      if (isChair) {
        let lc = 0;
        let lp = 0;
        if (row.actions) {
          row.actions.forEach((a: any) => {
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
