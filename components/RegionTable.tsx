'use client';
import React from 'react';
import { calcRow, formatINR } from '@/lib/calculations';

interface RegionData {
  regions: {
    mtd: Record<string, number>;
    yday: Record<string, number>;
  };
  dates: {
    daysPassed: number;
    totalDays: number;
    daysRemaining: number;
  };
}

export default function RegionTable({ data, plan }: { data: RegionData, plan: Record<string, number> }) {
  const allRegions = Array.from(new Set([
    ...Object.keys(data.regions.mtd),
    ...Object.keys(data.regions.yday),
    ...Object.keys(plan)
  ]));

  let gtMtd = 0, gtYday = 0, gtPlan = 0;

  const getRowData = (region: string) => {
    const mtd = data.regions.mtd[region] || 0;
    const yday = data.regions.yday[region] || 0;
    const p = plan[region] ?? null;
    const row = calcRow(mtd, yday, p, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
    return { region, plan: p, ...row };
  };

  const priority = ["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Delhi", "Gujarat"];
  const rows: any[] = [];

  priority.forEach(reg => {
    if (allRegions.includes(reg)) {
      rows.push(getRowData(reg));
      allRegions.splice(allRegions.indexOf(reg), 1);
    }
  });

  allRegions.sort().forEach(reg => {
    if (reg !== "Unknown") rows.push(getRowData(reg));
  });

  if (allRegions.includes("Unknown")) {
    rows.push(getRowData("Unknown"));
  }

  rows.forEach(r => {
    gtMtd += r.mtd;
    gtYday += r.yday;
    if (r.plan != null) gtPlan += r.plan;
  });

  const gtRow = calcRow(gtMtd, gtYday, gtPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);

  const renderRow = (r: any, isTotal = false) => {
    const diffColor = r.diffPct > 0 ? '#48bb78' : r.diffPct < 0 ? '#fc8181' : '#ecc94b';
    const pillHtml = r.overUnder === 'Over'
      ? <span style={{ background: '#1a3a2a', color: '#48bb78', border: '1px solid #276749', borderRadius: '999px', padding: '2px 10px' }}>Over</span>
      : r.overUnder === 'Under'
      ? <span style={{ background: '#3a1a1a', color: '#fc8181', border: '1px solid #742a2a', borderRadius: '999px', padding: '2px 10px' }}>Under</span>
      : '—';

    return (
      <tr key={r.region} style={isTotal ? { background: '#0d2137', fontWeight: 'bold' } : {}}>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left' }}>{r.region}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.plan)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.mtd)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.yday)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.est)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', color: r.plan != null ? diffColor : 'inherit' }}>
          {r.plan != null ? `${r.diffPct > 0 ? '+' : ''}${r.diffPct}%` : '—'}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.estMinusPlan)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'center' }}>{pillHtml}</td>
      </tr>
    );
  };

  const exportCSV = () => {
    let csv = "Region,Overall (Plan),MTD,Yesterday,Est. Spends,Difference,Est - Plan,Over/Under\\n";
    rows.forEach(r => {
      csv += `"${r.region}",${r.plan || ''},${r.mtd},${r.yday},${r.est},${r.diffPct || ''},${r.estMinusPlan || ''},${r.overUnder || ''}\\n`;
    });
    csv += `"Grand Total",${gtPlan},${gtMtd},${gtYday},${gtRow.est},${gtRow.diffPct || ''},${gtRow.estMinusPlan || ''},${gtRow.overUnder || ''}\\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSC_Region_Report_${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: '10px', textAlign: 'right' }}>
        <button onClick={exportCSV} style={{ background: 'transparent', border: '1px solid #4a5568', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>Region</th>
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
            <React.Fragment key={r.region}>
              <tr style={{ background: i % 2 === 0 ? '#1a1d27' : '#1f2333', display: 'none' }}></tr>
              {renderRow(r)}
            </React.Fragment>
          ))}
          {renderRow({ region: 'Grand Total', plan: gtPlan, ...gtRow }, true)}
        </tbody>
      </table>
    </div>
  );
}
