import { fetchAllPages } from './lib/metaApi';
import { matchesCategoryForMetrics } from './lib/metricUtils';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function classifyFunnel(cn: string): string | null {
  if (cn.includes('growth'))                        return 'GROWTH';
  if (cn.includes('bot') && !cn.includes('growth')) return 'BOTTOM';
  if (cn.includes('mid') && !cn.includes('growth')) return 'MID';
  if (!cn.includes('mid') && !cn.includes('bot'))   return 'TOP';
  return null;
}

function processRows(rows: any[], cat: string) {
  let funnels: Record<string, { lc: number; lp: number }> = {
    TOP: { lc: 0, lp: 0 },
    MID: { lc: 0, lp: 0 },
    BOTTOM: { lc: 0, lp: 0 },
  };

  for (const row of rows) {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();
    let lc = 0, lp = 0;
    if (row.actions && Array.isArray(row.actions)) {
      row.actions.forEach((a: any) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
        if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
      });
    }

    if (cat === 'All') {
      if (cn.includes('dhoni') && !an.includes('mat')) continue;
      if (cn.includes('boost') || cn.includes('growth')) continue;
      if (an.includes('boost') || an.includes('growth')) continue;
    } else {
      if (!matchesCategoryForMetrics(cn, an, cat)) continue;
    }

    const funnel = classifyFunnel(cn);
    if (!funnel || funnel === 'GROWTH') continue;

    funnels[funnel].lc += lc;
    funnels[funnel].lp += lp;
  }

  const res: Record<string, string> = {};
  for (const f of ['TOP', 'MID', 'BOTTOM']) {
    const data = funnels[f];
    if (data.lc === 0) res[f] = '0.00%';
    else res[f] = ((data.lp / data.lc) * 100).toFixed(2) + '%';
  }
  return res;
}

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const BASE = 'https://graph.facebook.com/v19.0';
  
  const periods = [
    { name: 'Mar', since: '2024-03-01', until: '2024-03-31' },
    { name: 'Apr', since: '2024-04-01', until: '2024-04-30' },
    { name: 'May', since: '2024-05-01', until: '2024-05-31' },
    { name: 'Jun', since: '2024-06-01', until: '2024-06-30' }
  ];

  const categories = ['All', 'Chair', 'Mattress', 'Sofa', 'Desk'];

  for (const period of periods) {
    console.log(`\n--- ${period.name} ---`);
    const url = `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend,actions&time_range={"since":"${period.since}","until":"${period.until}"}&level=adset&limit=500&access_token=${token}`;
    const rows = await fetchAllPages(url);

    for (const cat of categories) {
      const res = processRows(rows, cat);
      console.log(`${cat.padEnd(10)} | TOP: ${res.TOP.padStart(6)} | MID: ${res.MID.padStart(6)} | BOT: ${res.BOTTOM.padStart(6)}`);
    }
  }
}

main().catch(console.error);
