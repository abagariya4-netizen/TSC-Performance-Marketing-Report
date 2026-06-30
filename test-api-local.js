const http = require('http');

async function testCategory(category) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3001/api/funnel-level-performance?category=${category}&startDate=2026-06-01&endDate=2026-06-30`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    const cats = ['All', 'Chair', 'Desk', 'Elite', 'Foot Massager'];
    for (const cat of cats) {
        console.log(`\n================ ${cat} ================`);
        try {
            const data = await testCategory(encodeURIComponent(cat));
            if (data.campaigns) {
                for (const funnel of data.campaigns) {
                    const june = funnel['Jun-26'] || funnel['Jun\'26'] || funnel['Jun 26'] || funnel['June-26'] || funnel['June\'26'] || funnel['Jun-2026'];
                    
                    // Let's find the correct key for June
                    const key = Object.keys(funnel).find(k => k.toLowerCase().includes('jun'));
                    if (key) {
                        const m = funnel[key];
                        console.log(`${funnel.name.padEnd(6)} | Spend: ${Math.round(m.spend)} | Walk-in: ${Math.round(m.walkin)}`);
                    } else {
                        console.log(`${funnel.name} | No June data found.`);
                    }
                }
            } else {
                console.log(data);
            }
        } catch (e) {
            console.error('Error fetching', cat, e.message);
        }
    }
}

main().catch(console.error);
