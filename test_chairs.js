require('dotenv').config({ path: '.env.local' });
const { GoogleAdsApi } = require('google-ads-api');
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
  for await (const row of stream) {
    const rawTitle = row.segments.product_title;
    const campaignName = row.campaign.name.toLowerCase();
    const cost = (row.metrics.cost_micros || 0) / 1000000;
    
    if (rawTitle.includes('Onyx') || rawTitle.includes('Stylux') || rawTitle.includes('XGen') || rawTitle.includes('Ultron')) {
      console.log(`Campaign: ${row.campaign.name} | RawTitle: ${rawTitle.substring(0,40)} | Cost: ${cost}`);
    }
  }
}
run();
