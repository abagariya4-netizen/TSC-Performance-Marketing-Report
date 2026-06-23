const fs = require('fs');
let content = fs.readFileSync('app/region-spends-mattress/page.tsx', 'utf8');

// 1. h1 margin and header flex
content = content.replace(
  /<h1 style=\{\{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0' \}\}>Region Level Spends - Mattress \(Meta\)<\/h1>/,
  "<div><h1 style={{ fontSize: '24px', margin: 0 }}>Region Level Spends - Mattress (Meta)</h1>"
);

// 2. Date badge flex wrapper
content = content.replace(
  /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '15px' \}\}>/,
  "<div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>"
);

// 3. Close the new div wrapper for title + badge
content = content.replace(
  /<\/div>\s*<div style=\{\{ display: 'flex', gap: '1rem' \}\}>/,
  "</div>\n        </div>\n        <div style={{ display: 'flex', gap: '1rem' }}>"
);

// 4. Table properties
content = content.replace(
  /<table style=\{\{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' \}\}>/,
  "<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>"
);

// 5. Thead
content = content.replace(
  /<thead>/,
  "<thead style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>"
);

// 6. TH elements
content = content.replace(
  /<th style=\{\{ padding: '12px', textAlign: 'left' \}\}>Region<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Region</th>"
);

content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>Overall \(Plan\)<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Overall (Plan)</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>MTD<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>MTD</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>Yesterday<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Yesterday</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>Est\. Spends<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Est. Spends</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>Difference %<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Difference %</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px' \}\}>Est - Plan<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Est - Plan</th>"
);
content = content.replace(
  /<th style=\{\{ padding: '12px', textAlign: 'center' \}\}>Over\/Under<\/th>/,
  "<th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Over/Under</th>"
);

// 7. TD elements in the loop
// First cell
content = content.replace(
  /<td style=\{\{ padding: '12px', textAlign: 'left', fontWeight: 'bold' \}\}>\{r.region\}<\/td>/g,
  "<td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', background: idx % 2 === 0 ? '#1a1d27' : '#1f2333', position: 'sticky', left: 0 }}>{r.region}</td>"
);

// Other cells
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(r.plan\)\}<\/td>/g, "<td style={{ padding: '12px 8px' }}>{fmt(r.plan)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(r.mtd\)\}<\/td>/g, "<td style={{ padding: '12px 8px' }}>{fmt(r.mtd)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(r.yesterday\)\}<\/td>/g, "<td style={{ padding: '12px 8px' }}>{fmt(r.yesterday)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(r.estSpends\)\}<\/td>/g, "<td style={{ padding: '12px 8px' }}>{fmt(r.estSpends)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px', color: r.diffPct > 0 \? '#48bb78' : '#fc8181' \}\}>\{fmtPct\(r.diffPct\)\}<\/td>/g, "<td style={{ padding: '12px 8px', color: r.diffPct > 0 ? '#48bb78' : '#fc8181' }}>{fmtPct(r.diffPct)}</td>");

content = content.replace(/<td style=\{\{ padding: '12px', color: r.estMinusPlan > 0 \? '#fc8181' : '#48bb78' \}\}>/g, "<td style={{ padding: '12px 8px', color: r.estMinusPlan > 0 ? '#fc8181' : '#48bb78' }}>");

// Over/Under cell
content = content.replace(/<td style=\{\{ padding: '12px', textAlign: 'center' \}\}>/g, "<td style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #2d3348' }}>");

// 8. Total row
content = content.replace(
  /<tr style=\{\{ backgroundColor: '#2d3348', fontWeight: 'bold' \}\}>/,
  "<tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #2d3348', position: 'sticky', bottom: 0 }}>"
);
content = content.replace(
  /<td style=\{\{ padding: '12px', textAlign: 'left' \}\}>Total<\/td>/,
  "<td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', position: 'sticky', left: 0, background: '#111' }}>Total</td>"
);

content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(totals.plan\)\}<\/td>/, "<td style={{ padding: '12px 8px' }}>{fmt(totals.plan)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(totals.mtd\)\}<\/td>/, "<td style={{ padding: '12px 8px' }}>{fmt(totals.mtd)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(totals.yesterday\)\}<\/td>/, "<td style={{ padding: '12px 8px' }}>{fmt(totals.yesterday)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px' \}\}>\{fmt\(totals.estSpends\)\}<\/td>/, "<td style={{ padding: '12px 8px' }}>{fmt(totals.estSpends)}</td>");
content = content.replace(/<td style=\{\{ padding: '12px', color: totals.diffPct > 0 \? '#48bb78' : '#fc8181' \}\}>\{fmtPct\(totals.diffPct\)\}<\/td>/, "<td style={{ padding: '12px 8px', color: totals.diffPct > 0 ? '#48bb78' : '#fc8181' }}>{fmtPct(totals.diffPct)}</td>");

content = content.replace(/<td style=\{\{ padding: '12px', color: totals.estMinusPlan > 0 \? '#fc8181' : '#48bb78' \}\}>/, "<td style={{ padding: '12px 8px', color: totals.estMinusPlan > 0 ? '#fc8181' : '#48bb78' }}>");

fs.writeFileSync('app/region-spends-mattress/page.tsx', content);
console.log('Formatted!');
