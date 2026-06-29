import { queryAllGoogleAdsAccounts } from './lib/googleAdsAuth';
import { getCleanProductName } from './lib/productTitleMap';

async function run() {
  const gaql = `
    SELECT segments.product_item_id, segments.product_title, campaign.name, 
    campaign.advertising_channel_type, metrics.cost_micros
    FROM shopping_performance_view
    WHERE segments.date BETWEEN '2026-03-01' AND '2026-03-31'
    AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
  `;
  const data = await queryAllGoogleAdsAccounts(gaql);
  
  const EXCLUSIONS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];
  
  const mattressProducts: Record<string, number> = {};
  
  data.forEach(row => {
    const cost = Number(row.metrics?.costMicros || 0) / 1000000;
    const camp = (row.campaign?.name || '').toLowerCase();
    
    const isExcluded = EXCLUSIONS.some(ex => camp.includes(ex));
    if (isExcluded) return;
    
    let isMattress = false;
    if (!camp.includes('chair') && !camp.includes('desk') && !camp.includes('elite') && 
        !camp.includes('sofa') && !camp.includes('foot') && !camp.includes('massager') && 
        !camp.includes('accessories') && !camp.includes('pillow') && !camp.includes('cushion') && 
        !camp.includes('bed')) {
       isMattress = true;
    }
    
    if (isMattress) {
      const rawTitle = row.segments?.productTitle || 'Unknown';
      const cleanName = getCleanProductName(rawTitle);
      mattressProducts[cleanName] = (mattressProducts[cleanName] || 0) + cost;
    }
  });

  // Sort by cost desc
  const sorted = Object.entries(mattressProducts).sort((a, b) => b[1] - a[1]);
  for (const [name, cost] of sorted) {
     console.log(`${name}: ${cost}`);
  }
}

run().catch(console.error);
