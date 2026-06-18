import { queryAllGoogleAdsAccounts } from './lib/googleAdsAuth';
import * as fs from 'fs';
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

async function run() {
  const query = `
    SELECT campaign.name, campaign.advertising_channel_type, metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '2026-06-01' AND '2026-06-16'
  `;

  console.log("Fetching data from all child accounts...");
  const results = await queryAllGoogleAdsAccounts(query);
  console.log(`Fetched ${results.length} campaign records.`);

  let allCampaigns: any[] = [];
  results.forEach(row => {
    if (row.campaign && row.metrics) {
      allCampaigns.push({
        name: row.campaign.name,
        channel: row.campaign.advertisingChannelType,
        cost: Number(row.metrics.costMicros) / 1000000
      });
    }
  });

  const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf', 'chair', 'sofa', 'desk', 'elite', 'foot', 'bed', 'acce', 'pillow', 'cushion', 'massa', 'sensai', 'boost'];
  
  let validCampaigns = allCampaigns.filter(c => {
    const nameStr = c.name.toLowerCase();
    if (!nameStr.includes('mat')) return false;
    for (const ex of exclusions) {
      if (nameStr.includes(ex)) return false;
    }
    return true;
  });

  function getCity(name: string) {
    const n = name.toLowerCase();
    if (n.includes('mum')) return 'Mumbai';
    if (n.includes('beng')) return 'Bengaluru';
    if (n.includes('chen')) return 'Chennai';
    if (n.includes('hyd')) return 'Hyderabad';
    if (n.includes('ahm') || n.includes('surat') || n.includes('rajkot') || n.includes('vadodara') || n.includes('guj')) return 'Gujarat';
    if (n.includes('del') || n.includes('ncr') || n.includes('noida') || n.includes('gurgaon') || n.includes('gurugram')) return 'Delhi+NCR';
    return 'None';
  }

  console.log("\n=== PROBLEM 1: CITY ATTRIBUTION METHOD ===");
  const cityTotals: Record<string, number> = {
    'Mumbai': 0, 'Bengaluru': 0, 'Chennai': 0, 'Hyderabad': 0, 'Gujarat': 0, 'Delhi+NCR': 0, 'None': 0
  };
  let noCityCampaigns: any[] = [];
  let noCitySpend = 0;

  validCampaigns.forEach(c => {
    const city = getCity(c.name);
    cityTotals[city] += c.cost;
    if (city === 'None') {
      noCityCampaigns.push(c);
      noCitySpend += c.cost;
    }
  });

  console.log("City Totals:");
  Object.keys(cityTotals).forEach(k => console.log(`  ${k}: ${cityTotals[k]}`));
  console.log(`Campaigns with NO city keyword: count=${noCityCampaigns.length}, total spend=${noCitySpend}`);

  console.log("\n=== PROBLEM 2: SEARCH NUMBERS ARE WRONG (Mumbai) ===");
  let searchMum = validCampaigns.filter(c => c.channel === 'SEARCH' && getCity(c.name) === 'Mumbai');
  let searchMumTotal = 0;
  let branded = 0;
  let nonBrand = 0;
  searchMum.forEach(c => {
    searchMumTotal += c.cost;
    if (c.name.toLowerCase().includes('brand')) {
      branded += c.cost;
    } else {
      nonBrand += c.cost;
      console.log(`  Non-Brand: ${c.name} | ${c.cost}`);
    }
  });
  console.log(`Total Mumbai Search: ${searchMumTotal}`);
  console.log(`  Branded: ${branded}`);
  console.log(`  Non-Brand: ${nonBrand}`);

  console.log("\n=== PROBLEM 3: DEMAND GEN VIDEO HUGE DISCREPANCY (Mumbai) ===");
  let dgMum = validCampaigns.filter(c => c.channel === 'DEMAND_GEN' && getCity(c.name) === 'Mumbai');
  let dgMumTotal = 0;
  let dgClick = 0;
  let dgVideo = 0;
  dgMum.forEach(c => {
    dgMumTotal += c.cost;
    if (c.name.toLowerCase().includes('click')) {
      dgClick += c.cost;
    } else {
      dgVideo += c.cost;
      console.log(`  DG Video: ${c.name} | ${c.cost}`);
    }
  });
  console.log(`Total Mumbai Demand Gen: ${dgMumTotal}`);
  console.log(`  DG Clicks: ${dgClick}`);
  console.log(`  DG Video: ${dgVideo}`);

  console.log("\n=== PROBLEM 4: PERFORMANCE MAX DISCREPANCY (Mumbai) ===");
  let pmaxMum = validCampaigns.filter(c => c.channel === 'PERFORMANCE_MAX' && getCity(c.name) === 'Mumbai');
  let pmaxMumTotal = 0;
  pmaxMum.forEach(c => {
    pmaxMumTotal += c.cost;
    console.log(`  PMax: ${c.name} | ${c.cost}`);
  });
  console.log(`Total Mumbai PMax: ${pmaxMumTotal}`);

  console.log("\n=== PROBLEM 5: NO REST ROW IN CORRECT OUTPUT ===");
  let withCity = 0;
  let withoutCity = 0;
  validCampaigns.forEach(c => {
    if (getCity(c.name) === 'None') {
      withoutCity += c.cost;
    } else {
      withCity += c.cost;
    }
  });
  console.log(`Total WITH city keyword: ${withCity}`);
  console.log(`Total WITHOUT city keyword: ${withoutCity}`);

  if (withoutCity > 0) {
    console.log("\nSample Campaigns Without City Keyword:");
    noCityCampaigns.slice(0, 10).forEach(c => console.log(`  ${c.name} | ${c.channel} | ${c.cost}`));
  }
}

run().catch(console.error);
