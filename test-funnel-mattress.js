const fs = require('fs');
const https = require('http');

function fetchFunnel(cat) {
  return new Promise((resolve, reject) => {
    https.get(`http://localhost:3000/api/funnel-level-performance?category=${encodeURIComponent(cat)}&startDate=2026-06-01&endDate=2026-06-30`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const data = await fetchFunnel('Mattress');
    if (!data.total) {
       console.log('Error from API:', data);
       return;
    }
    console.log("Mattress Total:");
    console.log(JSON.stringify(data.total['June 2026'], null, 2));
    console.log(data.campaigns.map(c => c.name));
  } catch (err) {
    console.error(err);
  }
}
main();
