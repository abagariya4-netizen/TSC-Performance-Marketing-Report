'use client';
import React, { useState, useEffect } from 'react';
import PlanUpload from '@/components/PlanUpload';

const PLAN_STORAGE_KEY = 'tsc_region_mattress_plan';

export default function RegionSpendsMattressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planMap, setPlanMap] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PLAN_STORAGE_KEY);
    if (saved) {
      try {
        setPlanMap(JSON.parse(saved));
      } catch (e) {}
    }

    fetch('/api/region-spends-mattress')
      .then(res => res.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handlePlanUpload = (csvText: string) => {
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    const newPlan: Record<string, number> = {};
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const region = parts[0].trim();
        const plan = parseFloat(parts[1].replace(/[^0-9.-]/g, '')) || 0;
        newPlan[region] = plan;
      }
    }
    setPlanMap(newPlan);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(newPlan));
  };

  const fmt = (num: number, dec: number = 0) => {
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec });
  };
  const fmtNum = (num: number) => num.toLocaleString('en-IN');
  const fmtPct = (num: number) => num.toFixed(2) + '%';

  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading data...</div>;
  if (error) return <div style={{ color: '#fc8181', padding: '2rem' }}>Error: {error}</div>;
  if (!data) return null;

  const { regions, daysTotal, daysPassed, daysRemaining } = data;
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const rows = regions.map((r: any) => {
    const plan = planMap[r.region] || 0;
    const estSpends = r.mtd + (r.yesterday * daysRemaining);
    let diffPct = 0;
    if (plan > 0 && daysTotal > 0 && daysPassed > 0) {
      diffPct = ((r.mtd / (plan * daysPassed / daysTotal)) - 1) * 100;
    }
    const estMinusPlan = estSpends - plan;
    const isOver = estSpends >= plan;

    return {
      region: r.region,
      plan,
      mtd: r.mtd,
      yesterday: r.yesterday,
      estSpends,
      diffPct,
      estMinusPlan,
      isOver
    };
  });

  const totals = rows.reduce((acc: any, r: any) => {
    acc.plan += r.plan;
    acc.mtd += r.mtd;
    acc.yesterday += r.yesterday;
    acc.estSpends += r.estSpends;
    acc.estMinusPlan += r.estMinusPlan;
    return acc;
  }, { plan: 0, mtd: 0, yesterday: 0, estSpends: 0, estMinusPlan: 0 });

  if (totals.plan > 0 && daysTotal > 0 && daysPassed > 0) {
    totals.diffPct = ((totals.mtd / (totals.plan * daysPassed / daysTotal)) - 1) * 100;
  } else {
    totals.diffPct = 0;
  }
  totals.isOver = totals.estSpends >= totals.plan;

  const exportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Region', 'Overall (Plan)', 'MTD', 'Yesterday', 'Est. Spends', 'Difference %', 'Est - Plan', 'Over/Under'];
      const csvRows = [headers.join(',')];
      for (const r of rows) {
        csvRows.push(`"${r.region}",${r.plan},${r.mtd},${r.yesterday},${r.estSpends},${r.diffPct.toFixed(2)}%,${r.estMinusPlan},${r.isOver ? 'Over' : 'Under'}`);
      }
      csvRows.push(`"Total",${totals.plan},${totals.mtd},${totals.yesterday},${totals.estSpends},${totals.diffPct.toFixed(2)}%,${totals.estMinusPlan},${totals.isOver ? 'Over' : 'Under'}`);
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `region-spends-mattress-meta-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Region Level Spends - Mattress (Meta)</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
              📅 {monthName} | Day {daysPassed} of {daysTotal} | {daysRemaining} days remaining
            </span>
            <PlanUpload 
              label="Plan" 
              onLoad={handlePlanUpload} 
              loaded={Object.keys(planMap).length > 0} 
              count={Object.keys(planMap).length} 
              unit="regions" 
              compact
            />
          </div>
        </div>
        <button 
          onClick={exportCSV}
          disabled={isExporting}
          style={{ 
            backgroundColor: '#2d3748', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          {isExporting ? 'Exporting...' : '📥 Export CSV'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2d3348' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8733a', color: '#fff' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Region</th>
              <th style={{ padding: '12px' }}>Overall (Plan)</th>
              <th style={{ padding: '12px' }}>MTD</th>
              <th style={{ padding: '12px' }}>Yesterday</th>
              <th style={{ padding: '12px' }}>Est. Spends</th>
              <th style={{ padding: '12px' }}>Difference %</th>
              <th style={{ padding: '12px' }}>Est - Plan</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Over/Under</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, idx: number) => (
              <tr key={r.region} style={{ backgroundColor: idx % 2 === 0 ? '#1a1d27' : '#1f2333', borderBottom: '1px solid #2d3348' }}>
                <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>{r.region}</td>
                <td style={{ padding: '12px' }}>{fmt(r.plan)}</td>
                <td style={{ padding: '12px' }}>{fmt(r.mtd)}</td>
                <td style={{ padding: '12px' }}>{fmt(r.yesterday)}</td>
                <td style={{ padding: '12px' }}>{fmt(r.estSpends)}</td>
                <td style={{ padding: '12px', color: r.diffPct > 0 ? '#48bb78' : '#fc8181' }}>{fmtPct(r.diffPct)}</td>
                <td style={{ padding: '12px', color: r.estMinusPlan > 0 ? '#fc8181' : '#48bb78' }}>
                  {r.estMinusPlan > 0 ? '+' : ''}{fmt(r.estMinusPlan)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ 
                    backgroundColor: r.isOver ? 'rgba(72,187,120,0.2)' : 'rgba(252,129,129,0.2)',
                    color: r.isOver ? '#48bb78' : '#fc8181',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {r.isOver ? 'Over' : 'Under'}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#2d3348', fontWeight: 'bold' }}>
              <td style={{ padding: '12px', textAlign: 'left' }}>Total</td>
              <td style={{ padding: '12px' }}>{fmt(totals.plan)}</td>
              <td style={{ padding: '12px' }}>{fmt(totals.mtd)}</td>
              <td style={{ padding: '12px' }}>{fmt(totals.yesterday)}</td>
              <td style={{ padding: '12px' }}>{fmt(totals.estSpends)}</td>
              <td style={{ padding: '12px', color: totals.diffPct > 0 ? '#48bb78' : '#fc8181' }}>{fmtPct(totals.diffPct)}</td>
              <td style={{ padding: '12px', color: totals.estMinusPlan > 0 ? '#fc8181' : '#48bb78' }}>
                {totals.estMinusPlan > 0 ? '+' : ''}{fmt(totals.estMinusPlan)}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <span style={{ 
                  backgroundColor: totals.isOver ? 'rgba(72,187,120,0.2)' : 'rgba(252,129,129,0.2)',
                  color: totals.isOver ? '#48bb78' : '#fc8181',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {totals.isOver ? 'Over' : 'Under'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
