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

export default function MetricsReport({ type, monthlyData, dailyData, periods, metricFn, extraColumns }: MetricsReportProps) {

  // Formats the primary metric (LC% or CPM fraction)
  const formatVal = (v: number | null) => {
    if (v == null) return '—';
    if (type === 'lc') return `${v}%`;
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
    const headerRow = ['Funnel', ...periodList.map(p => isMonth ? formatMonthHeader(p) : formatDayHeader(p)), ...extraColumns.map(c => c.label), 'vs Last Period', 'vs Avg Last 3', 'Last 7 Days'];
    
    let csv = headerRow.join(',') + '\n';
    
    FUNNELS.forEach(funnel => {
      const rowData = dataMap[funnel];
      const metricByPeriod: Record<string, number | null> = {};
      periodList.forEach(p => { metricByPeriod[p] = rowData[p] ? metricFn(rowData[p]) : null; });
      
      const { vsLastMonth, vsAvg3 } = calcComparisons(periodList, currentPeriod, metricByPeriod);
      const last7 = calcLast7Days(dailyData[funnel] || {}, (p) => dailyData[funnel][p] ? metricFn(dailyData[funnel][p]) : null);

      const currentRow = rowData[currentPeriod] || {};
      
      const rowLine = [
        funnel,
        ...periodList.map(p => metricByPeriod[p] != null ? metricByPeriod[p] : ''),
        ...extraColumns.map(c => c.format ? c.format(currentRow[c.key]) : (currentRow[c.key] || 0)),
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
          <h2 style={{ fontSize: '18px', margin: 0 }}>{title}</h2>
          <button onClick={() => exportCSV(dataMap, periodList, isMonth, filenamePrefix)} style={{ background: 'transparent', border: '1px solid #4a5568', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
            📥 Export CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2d3748' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Funnel</th>
                {periodList.map(p => (
                  <th key={p} style={{ padding: '10px 12px', background: p === currentPeriod ? '#1e3a5f' : 'transparent' }}>
                    {isMonth ? formatMonthHeader(p) : formatDayHeader(p)}
                  </th>
                ))}
                {extraColumns.map(c => (
                  <th key={c.key} style={{ padding: '10px 12px' }}>{c.label}</th>
                ))}
                <th style={{ padding: '10px 12px' }}>{currentHeader} vs Last {isMonth ? 'Month' : 'Day'}</th>
                <th style={{ padding: '10px 12px' }}>{currentHeader} vs Avg 3 {isMonth ? 'Months' : 'Days'}</th>
                <th style={{ padding: '10px 12px' }}>Last 7 Days</th>
              </tr>
            </thead>
            <tbody>
              {FUNNELS.map((funnel, i) => {
                const rowData = dataMap[funnel];
                const metricByPeriod: Record<string, number | null> = {};
                periodList.forEach(p => { metricByPeriod[p] = rowData[p] ? metricFn(rowData[p]) : null; });
                
                const { vsLastMonth, vsAvg3 } = calcComparisons(periodList, currentPeriod, metricByPeriod);
                const last7 = calcLast7Days(dailyData[funnel] || {}, (p) => dailyData[funnel][p] ? metricFn(dailyData[funnel][p]) : null);

                const currentRow = rowData[currentPeriod] || {};

                return (
                  <tr key={funnel} style={{ background: i % 2 === 0 ? '#1a1d27' : '#1f2333' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left', fontWeight: 'bold' }}>
                      {funnel.charAt(0).toUpperCase() + funnel.slice(1).toLowerCase()}
                    </td>
                    {periodList.map(p => (
                      <td key={p} style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', background: p === currentPeriod ? '#1e3a5f' : 'transparent' }}>
                        {formatVal(metricByPeriod[p])}
                      </td>
                    ))}
                    {extraColumns.map(c => (
                      <td key={c.key} style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                        {c.format ? c.format(currentRow[c.key]) : currentRow[c.key]?.toLocaleString('en-IN') || 0}
                      </td>
                    ))}
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatPct(vsLastMonth)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatPct(vsAvg3)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatPct(last7)}</td>
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
