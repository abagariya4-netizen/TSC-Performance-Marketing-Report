import { queryAllGoogleAdsAccounts } from './lib/googleAdsAuth';

async function run() {
  const campaignId = '20434028372';

  const gaql = `
    SELECT
      ad_group_criterion.keyword.text,
      metrics.cost_micros,
      metrics.impressions,
      metrics.search_impression_share
    FROM keyword_view
    WHERE campaign.id = '${campaignId}'
    AND segments.date BETWEEN '2026-03-01' AND '2026-03-31'
    AND ad_group_criterion.status != 'REMOVED'
  `;
  
  const res = await queryAllGoogleAdsAccounts(gaql);
  
  let totalCost = 0;
  const kwMap: Record<string, any> = {};

  res.forEach(row => {
    const kw = row.adGroupCriterion?.keyword?.text;
    const cost = Number(row.metrics?.costMicros || 0) / 1000000;
    const impr = Number(row.metrics?.impressions || 0);
    const is = Number(row.metrics?.searchImpressionShare || 0);
    
    totalCost += cost;
    if (kw) {
      if (!kwMap[kw]) kwMap[kw] = { cost: 0, impr: 0, eligible: 0, withIS: 0 };
      kwMap[kw].cost += cost;
      kwMap[kw].impr += impr;
      if (is > 0) {
        kwMap[kw].eligible += impr / is;
        kwMap[kw].withIS += impr;
      }
    }
  });

  const sorted = Object.entries(kwMap).sort((a, b) => b[1].cost - a[1].cost);
  for (const [kw, stats] of sorted.slice(0, 10)) {
     const avgIs = stats.eligible > 0 ? stats.withIS / stats.eligible : 0;
     console.log(`${kw} -> Cost: ${stats.cost}, Impr: ${stats.impr}, IS: ${(avgIs * 100).toFixed(2)}%`);
  }
}

run().catch(console.error);
