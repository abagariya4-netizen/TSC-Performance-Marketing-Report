const fs = require('fs');
const files = [
  'app/google-campaign-performance/page.tsx',
  'app/brand-impression/page.tsx',
  'app/funnel-level-performance/page.tsx',
  'app/walkin-dashboard/page.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Find the exact block we previously injected
  const oldLogicRegex = /const istString2 = [^;]+;\s*const today2 = [^;]+;\s*const yesterday2 = [^;]+;\s*const monthName = [^;]+;\s*const daysPassed = [^;]+;\s*const daysTotal = [^;]+;\s*const daysRemaining = [^;]+;/;
  
  const newStateLogic = `
  const [badgeInfo, setBadgeInfo] = useState<{ monthName: string, daysPassed: number, daysTotal: number, daysRemaining: number } | null>(null);

  useEffect(() => {
    const istString2 = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today2 = new Date(istString2);
    const yesterday2 = new Date(today2.getFullYear(), today2.getMonth(), today2.getDate() - 1);
    const mName = yesterday2.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dPassed = yesterday2.getDate();
    const dTotal = new Date(yesterday2.getFullYear(), yesterday2.getMonth() + 1, 0).getDate();
    setBadgeInfo({ monthName: mName, daysPassed: dPassed, daysTotal: dTotal, daysRemaining: dTotal - dPassed });
  }, []);
  `;

  content = content.replace(oldLogicRegex, newStateLogic);

  // Find the exact span we injected
  const oldSpanRegex = /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' \}\}>\s*<span style=\{\{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' \}\}>\s*📅 \{monthName\} \| Day \{daysPassed\} of \{daysTotal\} \| \{daysRemaining\} days remaining\s*<\/span>\s*<\/div>/g;

  const newSpan = `{badgeInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
              <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
                📅 {badgeInfo.monthName} | Day {badgeInfo.daysPassed} of {badgeInfo.daysTotal} | {badgeInfo.daysRemaining} days remaining
              </span>
            </div>
          )}`;

  content = content.replace(oldSpanRegex, newSpan);

  fs.writeFileSync(f, content);
});
console.log('Done fixing hydration error!');
