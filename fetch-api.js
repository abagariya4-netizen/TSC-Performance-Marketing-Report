const http = require('http');

setTimeout(() => {
  http.get('http://localhost:3000/api/google-city-spends', { headers: { 'Cookie': 'tsc_auth=true' } }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.rows) {
          console.log('Bengaluru:', json.rows.find(r => r.city === 'Bengaluru'));
          console.log('Rest:', json.rows.find(r => r.city === 'Rest'));
          console.log('Unknown:', json.rows.find(r => r.city === 'Unknown'));
        } else {
          console.log('No rows:', json);
        }
      } catch (e) {
        console.error('Error parsing JSON:', e.message, data.substring(0, 100));
      }
      process.exit(0);
    });
  }).on('error', (err) => {
    console.error('Error fetching API:', err.message);
    process.exit(1);
  });
}, 3000); // give server time to start
