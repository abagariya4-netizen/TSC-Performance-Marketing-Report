'use client';
import React, { useState } from 'react';
import { calcRow, formatINR } from '@/lib/calculations';

export default function CityTable({ data, plan }: { data: any, plan: Record<string, Record<string, number>> }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCity = (city: string) => {
    const newCol = new Set(collapsed);
    if (newCol.has(city)) newCol.delete(city);
    else newCol.add(city);
    setCollapsed(newCol);
  };

  const cities = ["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Delhi+NCR", "Gujarat"];

  let gtMtd = 0, gtYday = 0, gtPlan = 0;

  const renderRow = (r: any, isSubRow = false, isFunnelTotal = false, isGrandTotal = false) => {
    const diffColor = r.diffPct > 0 ? '#48bb78' : r.diffPct < 0 ? '#fc8181' : '#ecc94b';
    const pillHtml = r.overUnder === 'Over'
      ? <span style={{ background: '#1a3a2a', color: '#48bb78', border: '1px solid #276749', borderRadius: '999px', padding: '2px 10px' }}>Over</span>
      : r.overUnder === 'Under'
      ? <span style={{ background: '#3a1a1a', color: '#fc8181', border: '1px solid #742a2a', borderRadius: '999px', padding: '2px 10px' }}>Under</span>
      : '—';

    const bg = isGrandTotal ? '#0d2137' : '#1a1d27';
    const weight = (isFunnelTotal || isGrandTotal) ? 'bold' : 'normal';

    return (
      <tr key={r.id} style={{ background: bg, fontWeight: weight }}>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left', paddingLeft: isSubRow ? '30px' : '12px' }}>{r.name}</td>
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
      'Region', 'Overall (Plan)', 'MTD', 'Yesterday',
      'Est. Spends', 'Difference', 'Est - Plan', 'Over/Under'
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    cities.forEach(city => {
      const cityPlan = plan[city] || {};
      const funnels = ["Top", "Mid", "Bottom"];
      if (cityPlan["RNF"] !== undefined) funnels.push("RNF");
      funnels.push("Group", "Total");
      
      lines.push(`"${city}",,,,,,,`);
      
      funnels.forEach(f => {
        const key = f.toUpperCase();
        const p = cityPlan[f] ?? null;
        const m = data.cities.mtd[city]?.[key] || 0;
        const y = data.cities.yday[city]?.[key] || 0;
        const rowData = calcRow(m, y, p, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
        lines.push([
          `"${f}"`,
          p != null ? p : '',
          m,
          y,
          rowData.est,
          rowData.diffPct != null ? `${rowData.diffPct}%` : '',
          rowData.estMinusPlan != null ? rowData.estMinusPlan : '',
          rowData.overUnder ?? ''
        ].join(','));
      });
    });
    
    const gtRow = calcRow(gtMtd, gtYday, gtPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
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
    a.download = `TSC_6City_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
          {cities.map(city => {
            const isCol = collapsed.has(city);
            const cityPlan = plan[city] || {};
            const funnels = ["Top", "Mid", "Bottom"];
            if (cityPlan["RNF"] !== undefined) funnels.push("RNF");
            funnels.push("Group", "Total");

            return (
              <React.Fragment key={city}>
                <tr onClick={() => toggleCity(city)} style={{ background: '#e8733a', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  <td colSpan={8} style={{ padding: '10px 12px', textAlign: 'left' }}>
                    {isCol ? '▶' : '▼'} {city}
                  </td>
                </tr>
                {!isCol && funnels.map((f, i) => {
                  const key = f.toUpperCase();
                  const p = cityPlan[f] ?? null;
                  const m = data.cities.mtd[city]?.[key] || 0;
                  const y = data.cities.yday[city]?.[key] || 0;
                  const rowData = calcRow(m, y, p, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
                  
                  if (f === 'Total') {
                    gtMtd += m;
                    gtYday += y;
                    if (p != null) gtPlan += p;
                  }

                  return renderRow(
                    { id: `${city}-${f}`, name: f, plan: p, ...rowData },
                    f !== 'Total',
                    f === 'Total'
                  );
                })}
              </React.Fragment>
            );
          })}
          {(() => {
            const gtRow = calcRow(gtMtd, gtYday, gtPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
            return renderRow({ id: 'GT', name: 'Grand Total', plan: gtPlan, ...gtRow }, false, false, true);
          })()}
        </tbody>
      </table>
    </div>
  );
}
