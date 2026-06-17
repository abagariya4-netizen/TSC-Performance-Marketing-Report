const data = require('./api_response.json'); const blr = data.rows.find(r=>r.city==='Bengaluru'); console.log('Bengaluru yesterday:', blr.yesterday);
