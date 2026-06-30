const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/meta-lc?category=Mattress&since=2026-03-01&until=2026-06-30',
  method: 'GET',
  headers: {
    'Cookie': 'tsc_auth=true; meta_token=' + process.env.META_ACCESS_TOKEN
  }
};

http.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const m = json.monthly;
      if(!m) {
        console.log("No monthly data found", data.substring(0, 200));
        return;
      }
      console.log('--- NEXT.JS API OUTPUT FOR ALL CATEGORY ---');
      for (const month of ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01']) {
        const top = m.TOP[month] || {link_clicks: 0, landing_page_views: 0};
        const mid = m.MID[month] || {link_clicks: 0, landing_page_views: 0};
        const bot = m.BOTTOM[month] || {link_clicks: 0, landing_page_views: 0};
        
        const pTop = top.link_clicks === 0 ? '0.00%' : ((top.landing_page_views / top.link_clicks) * 100).toFixed(2) + '%';
        const pMid = mid.link_clicks === 0 ? '0.00%' : ((mid.landing_page_views / mid.link_clicks) * 100).toFixed(2) + '%';
        const pBot = bot.link_clicks === 0 ? '0.00%' : ((bot.landing_page_views / bot.link_clicks) * 100).toFixed(2) + '%';
        
        console.log(`${month.substring(5,7)} | TOP: ${pTop.padEnd(6)} (LC: ${top.link_clicks}) | MID: ${pMid.padEnd(6)} (LC: ${mid.link_clicks}) | BOT: ${pBot.padEnd(6)} (LC: ${bot.link_clicks})`);
      }
    } catch(e) {
      console.error(e.message);
      console.log(data.substring(0, 500));
    }
  });
}).on('error', console.error);
