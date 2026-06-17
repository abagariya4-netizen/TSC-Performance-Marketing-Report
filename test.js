fetch('https://tsc-performance-marketing-report.vercel.app/api/google-city-spends', { headers: { Cookie: 'tsc_auth=true' } }).then(r=>r.json()).then(console.log);
