'use client';
import React, { useState, Suspense } from 'react';
import { formatINR } from '@/lib/calculations';
import DaysCountBadge from '@/components/DaysCountBadge';

interface ProductRow {
  name: string;
  month1: number;
  month2: number;
  month3: number;
  curMonthFirst15: number;
  day3: number;
  day2: number;
  day1: number;
  salienceMonth1: number;
  salienceMonth2: number;
  salienceMonth3: number;
  salienceCurFirst15: number;
  salienceDay3: number;
  salienceDay2: number;
  salienceDay1: number;
  mtd: number;
  estSpends: number;
  vsAvg3Months: number | null;
  vsLastMonth: number | null;
}

interface ReportLabels {
  month1: string;
  month2: string;
  month3: string;
  curMonthFirst15: string;
  day3: string;
  day2: string;
  day1: string;
  lastMonth: string;
}

interface ReportData {
  categories: Record<string, { products: ProductRow[] }>;
  dateRanges: Record<string, { start: string, end: string }>;
  daysRemaining: number;
  daysPassed: number;
  labels: ReportLabels;
}

const CATEGORIES = ['Mattress', 'Chair', 'Desk', 'Accessories', 'Foot Massager', 'Bed', 'Elite', 'Sofa'];

function ProductSpendsTable({ data, selectedCategory }: { data: ReportData, selectedCategory: string }) {
  const categoryData = data.categories[selectedCategory] || { products: [] };
  const rows = categoryData.products;
  const labels = data.labels;

  const exportCSV = () => {
    const headers = [
      'Product',
      `${labels.month1} Amount`, `${labels.month1} Salience %`,
      `${labels.month2} Amount`, `${labels.month2} Salience %`,
      `${labels.month3} Amount`, `${labels.month3} Salience %`,
      `${labels.curMonthFirst15} Amount`, `${labels.curMonthFirst15} Salience %`,
      `${labels.day3} Amount`, `${labels.day3} Salience %`,
      `${labels.day2} Amount`, `${labels.day2} Salience %`,
      `${labels.day1} Amount`, `${labels.day1} Salience %`,
      'MTD', 'Est. Spends', 'vs Avg 3 Months %', `vs ${labels.lastMonth} %`
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    rows.forEach(r => {
      lines.push([
        `"${r.name}"`,
        r.month1, r.salienceMonth1,
        r.month2, r.salienceMonth2,
        r.month3, r.salienceMonth3,
        r.curMonthFirst15, r.salienceCurFirst15,
        r.day3, r.salienceDay3,
        r.day2, r.salienceDay2,
        r.day1, r.salienceDay1,
        r.mtd, r.estSpends,
        r.vsAvg3Months !== null ? r.vsAvg3Months : '',
        r.vsLastMonth !== null ? r.vsLastMonth : ''
      ].join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSC_Google_Product_Spends_${selectedCategory}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderPct = (val: number | null) => {
    if (val === null || isNaN(val) || !isFinite(val)) return '—';
    const color = val > 0 ? '#48bb78' : val < 0 ? '#fc8181' : 'inherit';
    return <span style={{ color }}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</span>;
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
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product ({selectedCategory})</th>
            <th style={{ padding: '10px 12px' }}>{labels.month1}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>{labels.month2}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>{labels.month3}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>{labels.curMonthFirst15}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>{labels.day3}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>{labels.day2}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>{labels.day1}<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>Est. Spends<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(MTD + {labels.day1}×Remaining)</span></th>
            <th style={{ padding: '10px 12px' }}>vs Avg 3 Months</th>
            <th style={{ padding: '10px 12px' }}>vs {labels.lastMonth}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>No products found in this category.</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.name} style={{ background: i % 2 === 0 ? '#1a1d27' : '#1f2333' }}>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left' }}>{r.name}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.month1)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceMonth1 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.month2)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceMonth2 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.month3)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceMonth3 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.curMonthFirst15)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceCurFirst15 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.day3)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceDay3 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.day2)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceDay2 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.day1)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceDay1 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', fontWeight: 'bold' }}>
                {formatINR(r.estSpends)}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                {renderPct(r.vsAvg3Months)}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                {renderPct(r.vsLastMonth)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageContent() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Mattress');

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/google-product-spends');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date().toLocaleString('en-IN'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', padding: '24px', color: 'white' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Product Spends (Google)</h1>
        <DaysCountBadge />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ background: '#1a1d27', color: 'white', border: '1px solid #4a5568', borderRadius: '6px', padding: '8px 12px' }}
        >
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <button
          onClick={generateReport}
          disabled={loading}
          style={{ background: '#e8733a', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : '🔄 Generate Report'}
        </button>

        {lastUpdated && <span style={{ color: '#a0aec0', fontSize: '14px' }}>Last updated: {lastUpdated}</span>}
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px' }}>Error: {error}</div>}

      {data && <ProductSpendsTable data={data} selectedCategory={selectedCategory} />}
    </div>
  );
}

export default function ProductSpendsPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f1117', minHeight: '100vh', color: 'white', padding: '24px' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
