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
    const diffColor = r.diffPct > 0 ? 'var(--success-color)' : r.diffPct < 0 ? 'var(--danger-color)' : 'var(--warning-color)';
    const pillHtml = r.overUnder === 'Over'
      ? <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '999px', padding: '2px 10px' }}>Over</span>
      : r.overUnder === 'Under'
      ? <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--danger-color)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '999px', padding: '2px 10px' }}>Under</span>
      : '—';

    const bg = isGrandTotal ? 'rgba(0,0,0,0.2)' : 'transparent';
    const weight = (isFunnelTotal || isGrandTotal) ? 'bold' : 'normal';

    return (
      <tr key={r.id} style={{ background: bg, fontWeight: weight }}>
        <td style={{ textAlign: 'left', paddingLeft: isSubRow ? '30px' : '12px', borderRight: '1px solid var(--border-color)' }}>{r.name}</td>
        <td>{formatINR(r.plan)}</td>
        <td>{formatINR(r.mtd)}</td>
        <td>{formatINR(r.yday)}</td>
        <td>{formatINR(r.est)}</td>
        <td style={{ color: r.plan != null ? diffColor : 'inherit' }}>
          {r.plan != null ? `${r.diffPct > 0 ? '+' : ''}${r.diffPct}%` : '—'}
        </td>
        <td style={{ color: r.estMinusPlan != null ? (r.estMinusPlan < 0 ? 'var(--danger-color)' : 'var(--success-color)') : 'inherit' }}>{formatINR(r.estMinusPlan)}</td>
        <td style={{ textAlign: 'center' }}>{pillHtml}</td>
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
    <div style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '12px', textAlign: 'right' }}>
        <button onClick={exportCSV} className="btn-outline">
          📥 Export CSV
        </button>
      </div>
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>Region</th>
              <th style={{ textAlign: 'center' }}>Overall (Plan)</th>
              <th style={{ textAlign: 'center' }}>MTD</th>
              <th style={{ textAlign: 'center' }}>Yesterday</th>
              <th style={{ textAlign: 'center' }}>Est. Spends</th>
              <th style={{ textAlign: 'center' }}>Difference</th>
              <th style={{ textAlign: 'center' }}>Est - Plan</th>
              <th style={{ textAlign: 'center' }}>Over/Under</th>
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
                  <tr onClick={() => toggleCity(city)} style={{ background: 'var(--accent-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                    <td colSpan={8} style={{ textAlign: 'left' }}>
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
    </div>
  );
}
