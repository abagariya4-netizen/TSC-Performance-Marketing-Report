const fs = require('fs');
const https = require('http');

function fetchFunnel() {
  return new Promise((resolve, reject) => {
    https.get('http://localhost:3001/api/funnel-level-performance?category=All&startDate=2026-06-01&endDate=2026-06-30', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const data = await fetchFunnel();
    if (!data.total) {
       console.log('Error from API:', data);
       return;
    }
    console.log(JSON.stringify(data.total['Jun'], null, 2));
    
    let topSpend = 0, midSpend = 0, botSpend = 0, growthSpend = 0;
    data.campaigns.forEach(c => {
       const s = c['Jun']?.spend || 0;
       if (c.name === 'Top') topSpend = s;
       if (c.name === 'Mid') midSpend = s;
       if (c.name === 'Bottom') botSpend = s;
       if (c.name === 'Growth') growthSpend = s;
    });
    console.log(`TOP: ${topSpend}`);
    console.log(`MID: ${midSpend}`);
    console.log(`BOT: ${botSpend}`);
    console.log(`GROWTH: ${growthSpend}`);
  } catch (err) {
    console.error(err);
  }
}
main();
