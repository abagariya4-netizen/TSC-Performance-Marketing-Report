fetch('https://tsc-performance-marketing-report.vercel.app/api/debug-customers', { headers: { Cookie: 'tsc_auth=true' } }).then(r=>r.text()).then(console.log);
