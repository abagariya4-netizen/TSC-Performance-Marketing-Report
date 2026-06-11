import React from 'react';
import { formatINR } from '@/lib/calculations';
import { calcLast7DaysComparison, pctChange } from '@/lib/metricUtils';

export interface MetricRow {
  period: string; // date string or month
  spend: number;
  [key: string]: any; // dynamic metrics like link_clicks, impressions, etc.
}

interface MetricsReportProps {
  type: 'lc' | 'cpm';
  monthlyData: MetricRow[];
  dailyData: MetricRow[];
  metricFn: (r: any) => number | null;
  metricLabel: string;
  extraColumns: { key: string; label: string; format?: (v: any) => string }[];
}

export default function MetricsReport({ type, monthlyData, dailyData, metricFn, metricLabel, extraColumns }: MetricsReportProps) {
  
  // Format standard metric value
  const formatVal = (v: number | null) => {
    if (v == null) return '—';
    return type === 'lc' ? `${v}%` : formatINR(v);
  };

  const formatPct = (pct: number | null) => {
    if (pct == null) return <span style={{ color: '#666' }}>—</span>;
    const color = pct > 0 ? '#48bb78' : pct < 0 ? '#fc8181' : 'inherit';
    const sign  = pct > 0 ? '+' : '';
    return <span style={{ color }}>{sign}{pct}%</span>;
  };

  // Add comparisons
  const addComparisons = (rows: any[]) => {
    return rows.map((row, i) => {
      const current = metricFn(row);
      
      const prevRow = i > 0 ? rows[i - 1] : null;
      const prevVal = prevRow ? metricFn(prevRow) : null;
      const vsLastMonth = current != null && prevVal != null ? pctChange(current, prevVal) : null;

      const last3 = rows.slice(Math.max(0, i - 3), i)
        .map(r => metricFn(r))
        .filter((v): v is number => v != null);
      const avg3 = last3.length > 0 ? last3.reduce((s, v) => s + v, 0) / last3.length : null;
      const vsAvg3 = current != null && avg3 != null ? pctChange(current, avg3) : null;

      return { ...row, metricValue: current, vsLastMonth, vsAvg3 };
    });
  };

  const processedMonthly = addComparisons(monthlyData);
  const processedDaily   = addComparisons(dailyData);
  const last7Stats       = calcLast7DaysComparison(dailyData, metricFn);

  const exportCSV = (data: any[], filenamePrefix: string) => {
    let csv = `Period,Amount Spent,${metricLabel},${extraColumns.map(c => c.label).join(',')},vs Last Period,vs Avg Last 3 Periods\n`;
    data.forEach(r => {
      const extraVals = extraColumns.map(c => c.format ? c.format(r[c.key]) : r[c.key]).join(',');
      const mVal = r.metricValue != null ? r.metricValue : '';
      csv += `"${r.period}",${r.spend},${mVal},${extraVals},${r.vsLastMonth || ''},${r.vsAvg3 || ''}\n`;
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

  const renderTable = (data: any[], title: string, filenamePrefix: string) => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>{title}</h2>
        <button onClick={() => exportCSV(data, filenamePrefix)} style={{ background: 'transparent', border: '1px solid #4a5568', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2d3748' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Period</th>
              <th style={{ padding: '10px 12px' }}>Amount Spent</th>
              <th style={{ padding: '10px 12px' }}>{metricLabel}</th>
              {extraColumns.map(c => (
                <th key={c.key} style={{ padding: '10px 12px' }}>{c.label}</th>
              ))}
              <th style={{ padding: '10px 12px' }}>vs Last Period</th>
              <th style={{ padding: '10px 12px' }}>vs Avg Last 3</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={6 + extraColumns.length} style={{ padding: '20px', textAlign: 'center', background: '#1a1d27', color: '#a0aec0' }}>No data available for this range</td></tr>
            )}
            {data.map((r, i) => (
              <tr key={r.period} style={{ background: i % 2 === 0 ? '#1a1d27' : '#1f2333' }}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left' }}>{r.period}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.spend)}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', fontWeight: 'bold' }}>{formatVal(r.metricValue)}</td>
                {extraColumns.map(c => (
                  <td key={c.key} style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                    {c.format ? c.format(r[c.key]) : r[c.key]?.toLocaleString('en-IN') || 0}
                  </td>
                ))}
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatPct(r.vsLastMonth)}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatPct(r.vsAvg3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {renderTable(processedMonthly, '📊 Month Level', 'Monthly')}
      {renderTable(processedDaily, '📅 Day Level', 'Daily')}
      
      <div style={{ background: '#1a1d27', border: '1px solid #2d3748', padding: '20px', borderRadius: '8px', maxWidth: '400px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📆 Last 7 Days Comparison
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '15px' }}>
          <div style={{ color: '#a0aec0' }}>Yesterday:</div>
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatVal(last7Stats.yesterday)}</div>
          
          <div style={{ color: '#a0aec0' }}>Avg (last 7d):</div>
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatVal(last7Stats.last7avg)}</div>
          
          <div style={{ color: '#a0aec0', paddingTop: '12px', borderTop: '1px solid #2d3748' }}>Change:</div>
          <div style={{ textAlign: 'right', paddingTop: '12px', borderTop: '1px solid #2d3748', fontWeight: 'bold' }}>
            {formatPct(last7Stats.pct)}
            {last7Stats.pct != null && (last7Stats.pct > 0 ? ' ↑' : last7Stats.pct < 0 ? ' ↓' : '')}
          </div>
        </div>
      </div>
    </div>
  );
}
