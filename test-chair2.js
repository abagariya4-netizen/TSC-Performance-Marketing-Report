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

  // Target LC to LP for MID: 54.07, 53.18, 57.19, 55.91
  // Target for BOT: 56.01, 51.46, 50.97, 53.71

  // Let's iterate all possible rules
  const results = {};
  
  const CAMPAIGN_RULES = {
    'Chair': { contains: 'chair', excludes: ['boost','growth','desk','sofa'] }
  };
  const ADSET_EXCLUDES = {
    'Chair': ['mattress','mat','desk','sofa','boost','growth']
  };

  const getLC = (r) => {
    let lc = 0;
    if (r.actions) r.actions.forEach(a => { if (a.action_type === 'link_click') lc += parseInt(a.value||0); });
    return lc;
  };
  const getLP = (r) => {
    let lp = 0;
    if (r.actions) r.actions.forEach(a => { if (a.action_type === 'landing_page_view') lp += parseInt(a.value||0); });
    return lp;
  };

  const dates = ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'];

  for (const method of ['Method1_Funnel', 'Method2_MetricUtils', 'Method3_Custom1']) {
    results[method] = { MID: {}, BOT: {} };
    for (const d of dates) {
      results[method].MID[d] = {lc:0, lp:0};
      results[method].BOT[d] = {lc:0, lp:0};
    }
  }

  for (const row of data) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    const lc = getLC(row);
    const lp = getLP(row);
    const date = row.date_start;
    
    let funnel = null;
    if (cn.includes('growth')) funnel = 'GROWTH';
    else if (cn.includes('bot')) funnel = 'BOT';
    else if (cn.includes('mid')) funnel = 'MID';
    else funnel = 'TOP';

    if (funnel !== 'MID' && funnel !== 'BOT') continue;
    if (!dates.includes(date)) continue;

    // METHOD 1: funnel-level-performance logic (currently in meta-lc)
    let m1_pass = false;
    if (!cn.includes('boost')) { // isCampaignExcluded
      const isProductCreative = an.includes('_all_asset') || an.includes(' all asset') || an.includes('_video') || an.includes(' video');
      let catPass = false;
      if (isProductCreative) {
        catPass = an.includes('chair');
      } else {
        catPass = cn.includes('chair');
      }
      let adsetExclusions = !['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => an.includes(ex));
      if (catPass && adsetExclusions) m1_pass = true;
    }

    // METHOD 2: metricUtils logic (original meta-lc)
    let m2_pass = false;
    let isAllProductsOrDhoni = cn.includes('all_products') || cn.includes('dhoni');
    if (!isAllProductsOrDhoni) {
      let cRulesPass = true;
      ['boost','growth','desk','sofa'].forEach(ex => { if (cn.includes(ex)) cRulesPass = false; });
      if (cRulesPass) {
        let skipAdsetExcludes = cn.includes('chair');
        let aExcludesPass = true;
        if (!skipAdsetExcludes) {
          ['mattress','mat','desk','sofa','boost','growth'].forEach(ex => { if (an.includes(ex)) aExcludesPass = false; });
        }
        if (aExcludesPass) {
          if (an.includes('chair') || cn.includes('chair')) {
            m2_pass = true;
          }
        }
      }
    }

    // METHOD 3: Try to find exactly what Excel is doing.
    // Excel might just use CAMPAIGN_RULES but NOT exclude all_products explicitly.
    let m3_pass = false;
    let cRulesPass3 = true;
    // Excel probably doesn't have the strict "all_products" block for Chair, since we see Mid/Bot data.
    ['boost','growth','desk','sofa'].forEach(ex => { if (cn.includes(ex)) cRulesPass3 = false; });
    if (cRulesPass3) {
      let skipAdsetExcludes3 = cn.includes('chair');
      let aExcludesPass3 = true;
      if (!skipAdsetExcludes3) {
        ['mattress','mat','desk','sofa','boost','growth'].forEach(ex => { if (an.includes(ex)) aExcludesPass3 = false; });
      }
      if (aExcludesPass3) {
        // Keyword match
        if (an.includes('chair') || cn.includes('chair')) {
          m3_pass = true;
        }
      }
    }

    if (m1_pass) {
      results.Method1_Funnel[funnel][date].lc += lc;
      results.Method1_Funnel[funnel][date].lp += lp;
    }
    if (m2_pass) {
      results.Method2_MetricUtils[funnel][date].lc += lc;
      results.Method2_MetricUtils[funnel][date].lp += lp;
    }
    if (m3_pass) {
      results.Method3_Custom1[funnel][date].lc += lc;
      results.Method3_Custom1[funnel][date].lp += lp;
    }
  }

  for (const method of Object.keys(results)) {
    console.log(`\n--- ${method} ---`);
    for (const fun of ['MID', 'BOT']) {
      const vals = [];
      for (const d of dates) {
        const o = results[method][fun][d];
        const pct = o.lc > 0 ? (o.lp / o.lc) * 100 : 0;
        vals.push(pct.toFixed(2));
      }
      console.log(`${fun}: ${vals.join('%, ')}%`);
    }
  }

}

run();
