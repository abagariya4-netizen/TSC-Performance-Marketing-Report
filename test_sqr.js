const fs = require('fs');

async function testQuery() {
  const GAQL = `
    SELECT
      search_term_view.search_term,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions_value
    FROM search_term_view
    WHERE campaign.advertising_channel_type = 'SEARCH'
    AND segments.date BETWEEN '2026-06-01' AND '2026-06-20'
    AND ad_group_criterion.keyword.text = 'mattress'
    LIMIT 10
  `;
  
  console.log("GAQL:", GAQL);
}

testQuery();
