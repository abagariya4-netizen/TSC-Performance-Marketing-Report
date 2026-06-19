import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});
const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
});

async function run() {
  const gaql = `
    SELECT segments.product_title, campaign.name, 
    campaign.advertising_channel_type, metrics.cost_micros
    FROM shopping_performance_view
    WHERE segments.date BETWEEN '2026-03-01' AND '2026-03-31'
    AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
  `;
  const stream = customer.reportStream({ entity: 'shopping_performance_view', query: gaql });
  let total = 0;
  let chairCampaign = 0;
  let genericCampaign = 0;
  for await (const row of stream) {
    const rawTitle = row.segments.product_title || '';
    const cost = Number(row.metrics?.costMicros || 0) / 1000000;
    const camp = (row.campaign?.name || '').toLowerCase();
    
    if (['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'].some(ex => camp.includes(ex))) continue;
    
    if (rawTitle.includes('Onyx Orthopedic')) {
      total += cost;
      if (camp.includes('chair')) chairCampaign += cost;
      else genericCampaign += cost;
    }
  }
  console.log('Total:', total);
  console.log('Chair Campaigns:', chairCampaign);
  console.log('Generic Campaigns:', genericCampaign);
}
run();
