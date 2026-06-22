const fs = require('fs');
const files = [
  'app/google-campaign-performance/page.tsx',
  'app/brand-impression/page.tsx',
  'app/funnel-level-performance/page.tsx',
  'app/walkin-dashboard/page.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Replace border colors
  content = content.replace(/#333/g, '#2d3348');

  // Replace font size in table
  content = content.replace(/fontSize: '13px'/g, "fontSize: '14px'");

  // Add uppercase bold to thead
  content = content.replace(/<thead>/g, "<thead style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>");

  // Replace Export CSV button
  content = content.replace(/<button[^>]*onClick={exportCSV}[^>]*>[\s\S]*?<\/button>/g, `<button 
          onClick={exportCSV}
          style={{ backgroundColor: '#2d3748', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          📥 Export CSV
        </button>`);

  // Inject date badge logic
  const dateLogic = `
  const istString2 = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const today2 = new Date(istString2);
  const yesterday2 = new Date(today2.getFullYear(), today2.getMonth(), today2.getDate() - 1);
  const monthName = yesterday2.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysPassed = yesterday2.getDate();
  const daysTotal = new Date(yesterday2.getFullYear(), yesterday2.getMonth() + 1, 0).getDate();
  const daysRemaining = daysTotal - daysPassed;
`;
  
  if (!content.includes('const monthName = yesterday2')) {
    content = content.replace(/(const \[error, setError\] = useState[^;]*;)/, '$1\n' + dateLogic);
  }

  // Replace DaysCountBadge with custom HTML
  content = content.replace(/<DaysCountBadge \/>/g, `<div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
              📅 {monthName} | Day {daysPassed} of {daysTotal} | {daysRemaining} days remaining
            </span>
          </div>`);

  // Remove import
  content = content.replace(/import DaysCountBadge from '@\/components\/DaysCountBadge';\r?\n/g, '');

  fs.writeFileSync(f, content);
});
console.log('Done!');
