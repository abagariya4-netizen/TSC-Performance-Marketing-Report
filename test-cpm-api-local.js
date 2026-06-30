const http = require('http');

async function testCategory(category) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000/api/meta-cpm?category=${category}&since=2026-06-01&until=2026-06-30`, (res) => {
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
    try {
        const data = await testCategory('Chair');
        console.log(Object.keys(data.monthly || {}));
    } catch (e) {
        console.error('Error fetching', e.message);
    }
}

main().catch(console.error);
