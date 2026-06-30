async function check() {
  try {
    const res = await fetch('http://localhost:3001/api/meta-lc?category=All&since=2024-03-01&until=2024-06-30', {
      headers: { 'Cookie': 'tsc_auth=true' }
    });
    const data = await res.json();
    if (data.error) return console.error("Error:", JSON.stringify(data.error));

    const monthly = data.monthly;
    const periods = ['2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'];
    const funnels = ['TOP', 'MID', 'BOTTOM', 'GROWTH'];

    console.log("LC to LP %:");
    
    for (const funnel of funnels) {
      let rowStr = funnel.padEnd(8, ' ') + " | ";
      for (const p of periods) {
        const stats = monthly[funnel] && monthly[funnel][p];
        if (stats && stats.link_clicks > 0) {
          const pct = (stats.landing_page_views / stats.link_clicks) * 100;
          rowStr += pct.toFixed(2) + "% | ";
        } else {
          rowStr += "  N/A  | ";
        }
      }
      console.log(rowStr);
    }
  } catch (err) {
    console.error(err);
  }
}
check();

