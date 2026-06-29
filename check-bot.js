
require('dotenv').config({ path: '.env.local' });

// Campaign name rules
const CAMPAIGN_RULES = {
  'All':          { excludes: ['boost','growth'] },
  'Mattress':     { contains: 'mat', excludes: ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai','boost','growth'] },
  'Chair':        { contains: 'chair', excludes: ['boost','growth','desk','sofa'] },
  'Desk':         { contains: 'desk', excludes: ['boost','growth','chair','sofa'] },
  'Sofa':         { contains: 'sofa', excludes: ['boost','growth','chair','desk'] },
  'Elite':        { contains: 'elite',  excludes: ['boost','growth'] },
  'Foot Massager':{ contains: 'foot',   excludes: ['boost','growth'] },
  'Accessories':  { contains: 'acce',   excludes: ['boost','growth'] },
  'Bed':          { contains: 'bed',    excludes: ['boost','growth'] },
};

// Adset name exclusion rules
const ADSET_EXCLUDES = {
  'All':          ['boost','growth'],
  'Mattress':     ['sofa','desk','chair','boost','growth'],
  'Chair':        ['mattress','mat','desk','sofa','boost','growth'],
  'Desk':         ['mattress','mat','sofa','chair','boost','growth'],
  'Sofa':         ['boost','growth'],
  'Elite':        ['boost','growth'],
  'Foot Massager':['boost','growth'],
  'Accessories':  ['boost','growth'],
  'Bed':          ['boost','growth'],
};

const CATEGORY_KEYWORDS = {
  'Mattress': 'mat',
  'Chair': 'chair',
  'Sofa': 'sofa',
  'Desk': 'desk',
  'Elite': 'elite',
  'Foot Massager': 'foot',
  'Accessories': 'acce',
  'Bed': 'bed',
};

function matchesCategoryForMetrics(
  campaignName,
  adsetName,
  category
) {
  const cn = (campaignName || '').toLowerCase();
  const an = (adsetName    || '').toLowerCase();

  const isAllProducts = cn.includes('all_products');
  const isMattress = cn.includes('mat') || cn.includes('dhoni');

  // STEP 1: Campaign Exclusions
  const cRules = CAMPAIGN_RULES[category];
  if (cRules && cRules.excludes) {
    for (const exc of cRules.excludes) {
      if (cn.includes(exc)) return false;
    }
  }

  // STEP 2: Adset Exclusions (bypassed if campaign explicitly claims the category)
  let skipAdsetExcludes = false;
  if (category === 'Mattress' && cn.includes('dhoni') && !isAllProducts) {
      skipAdsetExcludes = true;
  }
  if (category === 'Chair' && cn.includes('chair')) {
      skipAdsetExcludes = true;
  }
  if (category === 'Desk' && cn.includes('desk')) {
      skipAdsetExcludes = true;
  }
  if (category === 'Sofa' && cn.includes('sofa')) {
      skipAdsetExcludes = true;
  }

  if (!skipAdsetExcludes) {
    const aExcludes = ADSET_EXCLUDES[category] || [];
    for (const exc of aExcludes) {
      if (an.includes(exc)) return false;
    }
  }

  if (category === 'All') return true;

  // STEP 3: Does the adset explicitly contain the keyword?
  const keyword = CATEGORY_KEYWORDS[category];
  if (keyword && an.includes(keyword)) {
    return true;
  }

  // STEP 4: Does the campaign explicitly contain the keyword?
  if (category === 'Mattress' && isMattress) {
    return true;
  }
  if (category !== 'Mattress' && cRules?.contains && cn.includes(cRules.contains)) {
    return true;
  }

  return false;
}

async function check() {
  const url = `https://graph.facebook.com/v19.0/${process.env.META_AD_ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,actions&time_increment=monthly&level=adset&time_range=%7B%22since%22%3A%222026-04-01%22%2C%22until%22%3A%222026-04-30%22%7D&limit=500&access_token=${process.env.META_ACCESS_TOKEN}`;
  
  const data = await fetchAllPages(url);
  
  let lc = 0;
  let lp = 0;
  let lc2 = 0;
  let lp2 = 0;
  let included = [];

  for (const row of data) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    
    let isBot = cn.includes('bot') && !cn.includes('growth');
    if (!isBot) continue;

    let rLc = 0;
    let rLp = 0;
    if (row.actions) {
      row.actions.forEach(a => {
        if (a.action_type === 'link_click') rLc += parseInt(a.value||0);
        if (a.action_type === 'landing_page_view') rLp += parseInt(a.value||0);
      });
    }

    if (matchesCategoryForMetrics(cn, an, 'Mattress')) {
      lc += rLc;
      lp += rLp;
    }

    let cPass = !['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai','boost','growth'].some(ex => cn.includes(ex));
    let m2 = false;
    if (cPass) {
      let aPass = !['sofa','desk','chair','boost','growth'].some(ex => an.includes(ex));
      if (aPass) {
        if (an.includes('mat') || cn.includes('mat') || cn.includes('dhoni')) m2 = true;
      }
    }
    if (m2) {
      lc2 += rLc;
      lp2 += rLp;
      if (!matchesCategoryForMetrics(cn, an, 'Mattress')) {
         console.log("M2 TRUE BUT METRICS FALSE: ", cn, " | ", an);
      }
    } else {
      if (matchesCategoryForMetrics(cn, an, 'Mattress')) {
         console.log("METRICS TRUE BUT M2 FALSE: ", cn, " | ", an);
      }
    }
  }

  console.log(`Live Logic: Total LC: ${lc}, Total LP: ${lp}, Ratio: ${(lp/lc*100).toFixed(2)}%`);
  console.log(`NoAdsetSkip: Total LC: ${lc2}, Total LP: ${lp2}, Ratio: ${(lp2/lc2*100).toFixed(2)}%`);
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
check();
