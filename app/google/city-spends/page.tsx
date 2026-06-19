'use client';
import React, { useState, useEffect, Suspense } from 'react';
import PlanUpload from '@/components/PlanUpload';
import { calcRow, formatINR } from '@/lib/calculations';
import { parseRegionPlanCSV } from '@/lib/csvParser';
import DaysCountBadge from '@/components/DaysCountBadge';

interface CityData {
  rows: any[];
  yesterdayStr: string;
  monthStart: string;
  mtdTotal: number;
  ydayTotal: number;
  daysPassed: number;
  totalDays: number;
  daysRemaining: number;
}

function GoogleCityTable({ data, plan }: { data: CityData, plan: Record<string, number> }) {
  let gtMtd = 0, gtYday = 0, gtPlan = 0;

  const getRowData = (cityName: string) => {
    const existing = data.rows.find(r => r.city === cityName);
    const mtd = existing ? existing.mtd : 0;
    const yday = existing ? existing.yesterday : 0;
    const p = plan[cityName] ?? null;
    const row = calcRow(mtd, yday, p, data.daysPassed, data.totalDays, data.daysRemaining);
    return { city: cityName, plan: p, ...row };
  };

  // The backend already returns data.rows sorted exactly according to TSC_CITIES.
  // We use this exact order instead of resorting.
  const rows = data.rows.map(r => getRowData(r.city));

  rows.forEach(r => {
    gtMtd += r.mtd;
    gtYday += r.yday;
    if (r.plan != null) gtPlan += r.plan;
  });

  const gtRow = calcRow(gtMtd, gtYday, gtPlan, data.daysPassed, data.totalDays, data.daysRemaining);

  const renderRow = (r: any, isTotal = false) => {
    const diffColor = r.diffPct > 0 ? '#48bb78' : r.diffPct < 0 ? '#fc8181' : '#ecc94b';
    const pillHtml = r.overUnder === 'Over'
      ? <span style={{ background: '#1a3a2a', color: '#48bb78', border: '1px solid #276749', borderRadius: '999px', padding: '2px 10px' }}>Over</span>
      : r.overUnder === 'Under'
      ? <span style={{ background: '#3a1a1a', color: '#fc8181', border: '1px solid #742a2a', borderRadius: '999px', padding: '2px 10px' }}>Under</span>
      : '—';

    return (
      <tr key={r.city} style={isTotal ? { background: '#0d2137', fontWeight: 'bold' } : {}}>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left' }}>{r.city}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.plan)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.mtd)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.yday)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.est)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', color: r.plan != null ? diffColor : 'inherit' }}>
          {r.plan != null ? `${r.diffPct > 0 ? '+' : ''}${r.diffPct}%` : '—'}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', color: r.estMinusPlan != null ? (r.estMinusPlan < 0 ? '#fc8181' : '#48bb78') : 'inherit' }}>{formatINR(r.estMinusPlan)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'center' }}>{pillHtml}</td>
      </tr>
    );
  };

  const exportCSV = () => {
    const headers = [
      'City', 'Overall (Plan)', 'MTD', 'Yesterday',
      'Est. Spends', 'Difference', 'Est - Plan', 'Over/Under'
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    rows.forEach(r => {
      lines.push([
        `"${r.city}"`,
        r.plan != null ? r.plan : '',
        r.mtd,
        r.yday,
        r.est,
        r.diffPct != null ? `${r.diffPct}%` : '',
        r.estMinusPlan != null ? r.estMinusPlan : '',
        r.overUnder ?? ''
      ].join(','));
    });

    lines.push([
      '"Grand Total"',
      gtPlan,
      gtMtd,
      gtYday,
      gtRow.est,
      gtRow.diffPct != null ? `${gtRow.diffPct}%` : '',
      gtRow.estMinusPlan != null ? gtRow.estMinusPlan : '',
      gtRow.overUnder ?? ''
    ].join(','));

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSC_Google_City_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: '16px' }}>
      <div style={{ marginBottom: '10px', textAlign: 'right' }}>
        <button onClick={exportCSV} style={{ background: 'transparent', border: '1px solid #4a5568', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>City</th>
            <th style={{ padding: '10px 12px' }}>Overall (Plan)</th>
            <th style={{ padding: '10px 12px' }}>MTD</th>
            <th style={{ padding: '10px 12px' }}>Yesterday</th>
            <th style={{ padding: '10px 12px' }}>Est. Spends</th>
            <th style={{ padding: '10px 12px' }}>Difference</th>
            <th style={{ padding: '10px 12px' }}>Est - Plan</th>
            <th style={{ padding: '10px 12px' }}>Over/Under</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <React.Fragment key={r.city}>
              <tr style={{ background: i % 2 === 0 ? '#1a1d27' : '#1f2333', display: 'none' }}></tr>
              {renderRow(r)}
            </React.Fragment>
          ))}
          {renderRow({ city: 'Grand Total', plan: gtPlan, ...gtRow }, true)}
        </tbody>
      </table>
    </div>
  );
}

function PageContent() {
  const [plan, setPlan] = useState<Record<string,number> | null>(null);
  const [data, setData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const rp = localStorage.getItem('tsc_google_city_plan');
    if (rp) setPlan(JSON.parse(rp));
  }, []);

  const handlePlanUpload = (text: string) => {
    const parsed = parseRegionPlanCSV(text); // format is City,Plan, identical parser logic
    setPlan(parsed);
    localStorage.setItem('tsc_google_city_plan', JSON.stringify(parsed));
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/google-city-spends');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date().toLocaleString('en-IN'));
      if (json.debug && json.debug.length > 0) {
        console.warn('⚠️ MISSING SPEND TRACKER: These are the top places where spend went to Unknown or Rest:');
        console.table(json.debug);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ color: 'white', padding: '0 24px 24px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>City Level Spends (Google)</h1>
        <DaysCountBadge />
      </div>

      {!plan ? (
        <div style={{ background: '#1a1d27', borderRadius: '12px', padding: '32px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ marginBottom: '24px', color: '#90cdf4' }}>Upload your plan CSV to get started</p>
          <PlanUpload label="City Plan CSV" onLoad={handlePlanUpload} loaded={false} count={0} unit="cities" />
        </div>
      ) : (
        <>
          <div style={{ background: '#1a3a2a', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PlanUpload label="City Plan" onLoad={handlePlanUpload} loaded={true} count={Object.keys(plan).length} unit="cities" compact />
            
            <button onClick={generateReport} disabled={loading}
              style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: '#e8733a', color: 'white', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
            </button>
          </div>

          {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

          {data && (
            <GoogleCityTable data={data} plan={plan} />
          )}

          {lastUpdated && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
              Last updated: {lastUpdated}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function GoogleCitySpendsPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '24px' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
