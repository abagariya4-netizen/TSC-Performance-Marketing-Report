setTimeout(() => fetch('https://tsc-performance-marketing-report.vercel.app/api/debug-cost', { headers: { Cookie: 'tsc_auth=true' } }).then(r=>r.text()).then(console.log), 5000);
