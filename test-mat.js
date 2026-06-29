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

  // Target LC to LP for MID: 36.86, 35.13, 35.97, 29.18
  // Target for BOT: 27.84, 25.19, 32.53, 28.98
  
  const dates = ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'];
  const results = {};

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

  const methods = ['CurrentLogic', 'NoAdsetSkip', 'IncludeAllProductsImplicitly', 'OnlyCampRule', 'ExcelLike'];
  for (const method of methods) {
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

    const campExcludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai','boost','growth'];
    const adsetExcludes = ['sofa','desk','chair','boost','growth'];

    let cPass = !campExcludes.some(ex => cn.includes(ex));
    
    // Method 1: Current Logic
    let m1 = false;
    if (cPass) {
      let skipAdset = cn.includes('all_products') || cn.includes('dhoni');
      let aPass = skipAdset ? true : !adsetExcludes.some(ex => an.includes(ex));
      if (aPass) {
        if (an.includes('mat') || cn.includes('mat') || cn.includes('dhoni')) m1 = true;
      }
    }
    
    // Method 2: No Adset Skip
    let m2 = false;
    if (cPass) {
      let aPass = !adsetExcludes.some(ex => an.includes(ex));
      if (aPass) {
        if (an.includes('mat') || cn.includes('mat') || cn.includes('dhoni')) m2 = true;
      }
    }

    // Method 3: Include all_products implicitly if adset doesn't have other product tags
    let m3 = false;
    if (cPass) {
      let aPass = !adsetExcludes.some(ex => an.includes(ex));
      if (aPass) {
        if (an.includes('mat') || cn.includes('mat') || cn.includes('dhoni') || (cn.includes('all_products') && aPass)) m3 = true;
      }
    }

    // Method 4: Only Campaign Rule
    let m4 = false;
    if (cPass) {
      if (cn.includes('mat')) m4 = true;
    }

    // Method 5: ExcelLike
    let m5 = false;
    if (cPass) {
      let skipAdset = cn.includes('mat'); // only bypass if campaign is explicit
      let aPass = skipAdset ? true : !adsetExcludes.some(ex => an.includes(ex));
      if (aPass) {
         if (an.includes('mat') || cn.includes('mat')) m5 = true;
      }
    }

    if (m1) { results.CurrentLogic[funnel][date].lc += lc; results.CurrentLogic[funnel][date].lp += lp; }
    if (m2) { results.NoAdsetSkip[funnel][date].lc += lc; results.NoAdsetSkip[funnel][date].lp += lp; }
    if (m3) { results.IncludeAllProductsImplicitly[funnel][date].lc += lc; results.IncludeAllProductsImplicitly[funnel][date].lp += lp; }
    if (m4) { results.OnlyCampRule[funnel][date].lc += lc; results.OnlyCampRule[funnel][date].lp += lp; }
    if (m5) { results.ExcelLike[funnel][date].lc += lc; results.ExcelLike[funnel][date].lp += lp; }
  }

  for (const method of methods) {
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
