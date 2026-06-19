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
  // Only show regions that exist in plan CSV — hide regions with no plan entry
  const planKeys = Object.keys(plan);
  const allRegions = planKeys.length > 0
    ? Array.from(new Set([...planKeys, 'Unknown']))
    : Array.from(new Set([
        ...Object.keys(data.regions.mtd),
        ...Object.keys(data.regions.yday),
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
    const diffColor = r.diffPct > 0 ? 'var(--success-color)' : r.diffPct < 0 ? 'var(--danger-color)' : 'var(--warning-color)';
    const pillHtml = r.overUnder === 'Over'
      ? <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '999px', padding: '2px 10px' }}>Over</span>
      : r.overUnder === 'Under'
      ? <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--danger-color)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '999px', padding: '2px 10px' }}>Under</span>
      : '—';

    return (
      <tr key={r.region} style={isTotal ? { background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' } : {}}>
        <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>{r.region}</td>
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

    rows.forEach(r => {
      lines.push([
        `"${r.region}"`,
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
    a.download = `TSC_Region_Report_${new Date().toISOString().split('T')[0]}.csv`;
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
            {rows.map((r, i) => (
              <React.Fragment key={r.region}>
                {renderRow(r)}
              </React.Fragment>
            ))}
            {renderRow({ region: 'Grand Total', plan: gtPlan, ...gtRow }, true)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
