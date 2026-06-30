const fs = require('fs');
const https = require('http');

function fetchCPM() {
  return new Promise((resolve, reject) => {
    https.get('http://localhost:3000/api/meta-cpm?category=All&since=2026-06-01&until=2026-06-30', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const data = await fetchCPM();
    console.log(JSON.stringify(data.monthly, null, 2));
  } catch (err) {
    console.error(err);
  }
}
main();
