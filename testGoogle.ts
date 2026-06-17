import { queryGoogleAds } from './lib/googleAdsAuth.ts';
async function run() {
  require('dotenv').config({ path: '.env.local' });
  try {
    const rows = await queryGoogleAds("SELECT geo_target_constant.name, geo_target_constant.resource_name FROM geo_target_constant WHERE geo_target_constant.country_code = 'IN' AND geo_target_constant.target_type = 'City' LIMIT 5");
    console.log('GEO MAP ROWS:', rows.length, rows);
  } catch (e) {
    console.error('ERROR:', e);
  }
}
run();
