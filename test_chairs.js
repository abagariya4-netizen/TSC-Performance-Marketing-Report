const { GoogleAdsApi } = require('google-ads-api');
require('dotenv').config({ path: '.env.local' });

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});
const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

async function run() {
  const gaql = `
    SELECT segments.product_title, campaign.name, 
    campaign.advertising_channel_type, metrics.cost_micros
    FROM shopping_performance_view
    WHERE segments.date BETWEEN '2026-03-01' AND '2026-03-31'
    AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
  `;
  const stream = customer.reportStream({ query: gaql });
  let totalOnyx = 0;
  let campaignOnyx = 0;
  let genericOnyx = 0;

  for await (const row of stream) {
    const rawTitle = row.segments.product_title || '';
    const campaignName = (row.campaign.name || '').toLowerCase();
    const cost = (row.metrics.cost_micros || 0) / 1000000;
    
    // Check exclusions
    if (['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'].some(ex => campaignName.includes(ex))) continue;

    if (rawTitle.includes('Onyx Orthopedic Office Chair')) {
      totalOnyx += cost;
      if (campaignName.includes('chair')) {
        campaignOnyx += cost;
      } else {
        genericOnyx += cost;
        console.log(`Generic Campaign for Onyx: ${campaignName} | Cost: ${cost}`);
      }
    }
  }
  console.log(`Total Onyx Spend (All campaigns): ${totalOnyx}`);
  console.log(`Onyx Spend in 'chair' campaigns: ${campaignOnyx}`);
  console.log(`Onyx Spend in generic campaigns: ${genericOnyx}`);
}
run().catch(console.error);
