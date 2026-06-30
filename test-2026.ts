import { fetchAllPages } from './lib/metaApi';
import { matchesCategoryForMetrics } from './lib/metricUtils';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function classifyFunnel(cn: string) {
  if (cn.includes('growth')) return 'GROWTH';
  if (cn.includes('bot') && !cn.includes('growth')) return 'BOTTOM';
  if (cn.includes('mid') && !cn.includes('growth')) return 'MID';
  if (cn.includes('top')) return 'TOP';
  return null;
}

async function main() {
  const url = `https://graph.facebook.com/v19.0/${process.env.META_AD_ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,actions,date_start&time_increment=monthly&time_range={"since":"2026-03-01","until":"2026-06-30"}&level=adset&limit=500&access_token=${process.env.META_ACCESS_TOKEN}`;
  
  const rows = await fetchAllPages(url);
  
  const categories = ['All', 'Elite', 'Foot Massager'];
  
  const results: Record<string, Record<string, Record<string, any>>> = {};
  for (const cat of categories) {
    results[cat] = {
      '03': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} },
      '04': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} },
      '05': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} },
      '06': { TOP: {lc:0, lp:0}, MID: {lc:0, lp:0}, BOTTOM: {lc:0, lp:0} }
    };
  }

  for (const r of rows) {
    const cn = (r.campaign_name || '').toLowerCase();
    const an = (r.adset_name || '').toLowerCase();
    
    let lc = 0, lp = 0;
    if (r.actions) {
      r.actions.forEach((a: any) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
        if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
      });
    }

    const month = r.date_start.split('-')[1];
    if (!['03', '04', '05', '06'].includes(month)) continue;

    for (const cat of categories) {
      if (matchesCategoryForMetrics(cn, an, cat)) {
        const funnel = classifyFunnel(cn);
        if (funnel && funnel !== 'GROWTH') {
          results[cat][month][funnel].lc += lc;
          results[cat][month][funnel].lp += lp;
        }
      }
    }
  }

  for (const cat of categories) {
    console.log(`\n--- ${cat.toUpperCase()} ---`);
    for (const month of ['03', '04', '05', '06']) {
      console.log(`Month: ${month}`);
      for (const f of ['TOP', 'MID', 'BOTTOM']) {
        const data = results[cat][month][f];
        const pct = data.lc === 0 ? '0.00%' : ((data.lp / data.lc) * 100).toFixed(2) + '%';
        console.log(`  ${f}: ${pct} (LC: ${data.lc}, LP: ${data.lp})`);
      }
    }
  }
}
main().catch(console.error);
