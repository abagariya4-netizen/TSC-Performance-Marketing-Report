import React from 'react';
import { calcComparisons, calcLast7Days, FUNNELS, Funnel } from '@/lib/metricUtils';
import { formatINR } from '@/lib/calculations';

interface MetricsReportProps {
  type: 'lc' | 'cpm';
  monthlyData: Record<Funnel, Record<string, any>>;
  dailyData: Record<Funnel, Record<string, any>>;
  periods: { months: string[]; days: string[] };
  metricFn: (r: any) => number | null;
  metricLabel: string;
  extraColumns: { key: string; label: string; format?: (v: any) => string }[];
}

export default function MetricsReport({ type, monthlyData, dailyData, periods, metricFn, metricLabel, extraColumns }: MetricsReportProps) {

  // Formats the primary metric (LC% or CPM fraction)
  const formatVal = (v: number | null) => {
    if (v == null) return '—';
    if (type === 'lc') return `${v.toFixed(2)}%`;
    return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Formats percentage comparisons (Green for +, Red for -)
  const formatPct = (pct: number | null) => {
    if (pct == null) return <span style={{ color: '#666' }}>—</span>;
    const color = pct > 0 ? '#48bb78' : pct < 0 ? '#fc8181' : 'inherit';
    const sign  = pct > 0 ? '+' : '';
    return <span style={{ color }}>{sign}{pct}%</span>;
  };

  // Helper to format month name (e.g., '2026-06-01' -> 'Jun')
  const formatMonthHeader = (ymd: string) => {
    const d = new Date(ymd);
    return d.toLocaleString('en-IN', { month: 'short' });
  };

  // Helper to format day name (e.g., '2026-06-05' -> '5 Jun')
  const formatDayHeader = (ymd: string) => {
    const d = new Date(ymd);
    return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`;
  };

  const exportCSV = (dataMap: Record<Funnel, Record<string, any>>, periodList: string[], isMonth: boolean, filenamePrefix: string) => {
    if (periodList.length === 0) return;
    const currentPeriod = periodList[periodList.length - 1];
    
    // Row 1: Top level groups
    const row1 = ['Funnel', metricLabel];
    for (let i = 1; i < periodList.length; i++) row1.push(''); // fill colspan
    extraColumns.forEach(c => {
      row1.push(c.label);
      for (let i = 1; i < periodList.length; i++) row1.push('');
    });
    row1.push('Comparisons', '', ''); // 3 comparison columns

    // Row 2: Sub-headers (months/days)
    const row2 = [''];
    periodList.forEach(p => row2.push(isMonth ? formatMonthHeader(p) : formatDayHeader(p)));
    extraColumns.forEach(c => {
      periodList.forEach(p => row2.push(isMonth ? formatMonthHeader(p) : formatDayHeader(p)));
    });
    row2.push(`vs Last ${isMonth ? 'Month' : 'Day'}`, `vs Avg 3 ${isMonth ? 'Months' : 'Days'}`, 'Last 7 Days');

    let csv = `"${row1.join('","')}"\n"${row2.join('","')}"\n`;
    
    FUNNELS.forEach(funnel => {
      const rowData = dataMap[funnel];
      const metricByPeriod: Record<string, number | null> = {};
      periodList.forEach(p => { metricByPeriod[p] = rowData[p] ? metricFn(rowData[p]) : null; });
      
      const { vsLastMonth, vsAvg3 } = calcComparisons(periodList, currentPeriod, metricByPeriod);
      const last7 = calcLast7Days(dailyData[funnel] || {}, (p) => dailyData[funnel][p] ? metricFn(dailyData[funnel][p]) : null);

      const g1Data = periodList.map(p => metricByPeriod[p] != null ? metricByPeriod[p] : '');
      const extraData = extraColumns.flatMap(c => 
        periodList.map(p => {
          const val = rowData[p] ? rowData[p][c.key] : 0;
          return val || 0; // Raw number for CSV
        })
      );
      
      const rowLine = [
        funnel,
        ...g1Data,
        ...extraData,
        vsLastMonth ?? '',
        vsAvg3 ?? '',
        last7 ?? ''
      ];

      csv += `"${rowLine.join('","')}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSC_${filenamePrefix}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTable = (dataMap: Record<Funnel, Record<string, any>>, periodList: string[], isMonth: boolean, title: string, filenamePrefix: string) => {
    if (periodList.length === 0) {
      return (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 12px 0' }}>{title}</h2>
          <div style={{ padding: '20px', textAlign: 'center', background: '#1a1d27', color: '#a0aec0', borderRadius: '8px' }}>
            No data available for this range
          </div>
        </div>
      );
    }

    const currentPeriod = periodList[periodList.length - 1];
    const currentHeader = isMonth ? formatMonthHeader(currentPeriod) : formatDayHeader(currentPeriod);

    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>{title}</h2>
          <button onClick={() => exportCSV(dataMap, periodList, isMonth, filenamePrefix)} className="btn-outline">
            📥 Export CSV
          </button>
        </div>
        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'bottom', borderRight: '1px solid var(--border-color)' }}>Funnel</th>
                <th colSpan={periodList.length} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{metricLabel}</th>
                {extraColumns.map(c => (
                  <th key={c.key} colSpan={periodList.length} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{c.label}</th>
                ))}
                <th colSpan={3} style={{ textAlign: 'center' }}>Comparisons</th>
              </tr>
              <tr>
                {periodList.map(p => (
                  <th key={`g1-${p}`} style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                    {isMonth ? formatMonthHeader(p) : formatDayHeader(p)}
                  </th>
                ))}
                {extraColumns.map(c => (
                  periodList.map(p => (
                    <th key={`g2-${c.key}-${p}`} style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                      {isMonth ? formatMonthHeader(p) : formatDayHeader(p)}
                    </th>
                  ))
                ))}
                <th style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>{currentHeader} vs Last {isMonth ? 'Month' : 'Day'}</th>
                <th style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>{currentHeader} vs Avg 3 {isMonth ? 'Months' : 'Days'}</th>
                <th style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>Last 7 Days</th>
              </tr>
            </thead>
            <tbody>
              {FUNNELS.map((funnel, i) => {
                const rowData = dataMap[funnel];
                const metricByPeriod: Record<string, number | null> = {};
                periodList.forEach(p => { metricByPeriod[p] = rowData[p] ? metricFn(rowData[p]) : null; });
                
                const { vsLastMonth, vsAvg3 } = calcComparisons(periodList, currentPeriod, metricByPeriod);
                const last7 = calcLast7Days(dailyData[funnel] || {}, (p) => dailyData[funnel][p] ? metricFn(dailyData[funnel][p]) : null);

                return (
                  <tr key={funnel}>
                    <td style={{ textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid var(--border-color)' }}>
                      {funnel.charAt(0).toUpperCase() + funnel.slice(1).toLowerCase()}
                    </td>
                    {periodList.map(p => (
                      <td key={`g1-${p}`}>
                        {formatVal(metricByPeriod[p])}
                      </td>
                    ))}
                    {extraColumns.map(c => (
                      periodList.map(p => {
                        const val = rowData[p] ? rowData[p][c.key] : 0;
                        return (
                          <td key={`g2-${c.key}-${p}`}>
                            {c.format ? c.format(val) : val?.toLocaleString('en-IN') || 0}
                          </td>
                        );
                      })
                    ))}
                    <td>{formatPct(vsLastMonth)}</td>
                    <td>{formatPct(vsAvg3)}</td>
                    <td>{formatPct(last7)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderTable(monthlyData, periods.months, true, '📊 Month Level', 'Monthly')}
      {renderTable(dailyData, periods.days, false, '📅 Day Level', 'Daily')}
    </div>
  );
}
