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
    <div style={{ marginTop: '16px', marginBottom: '32px' }}>
      <div style={{ marginBottom: '12px', textAlign: 'right' }}>
        <button onClick={exportCSV} className="btn-outline">
          📥 Export CSV
        </button>
      </div>
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>Product ({selectedCategory})</th>
              <th style={{ textAlign: 'center' }}>{labels.month1}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>{labels.month2}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>{labels.month3}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>{labels.curMonthFirst15}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>{labels.day3}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>{labels.day2}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>{labels.day1}<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Amt | Salience)</span></th>
              <th style={{ textAlign: 'center' }}>Est. Spends<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(MTD + {labels.day1}×Remaining)</span></th>
              <th style={{ textAlign: 'center' }}>vs Avg 3 Months</th>
              <th style={{ textAlign: 'center' }}>vs {labels.lastMonth}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No products found in this category.</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.name}>
                <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', fontWeight: 500 }}>{r.name}</td>
                <td>
                  <div>{formatINR(r.month1)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceMonth1 || 0).toFixed(1)}%</div>
                </td>
                <td>
                  <div>{formatINR(r.month2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceMonth2 || 0).toFixed(1)}%</div>
                </td>
                <td>
                  <div>{formatINR(r.month3)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceMonth3 || 0).toFixed(1)}%</div>
                </td>
                <td>
                  <div>{formatINR(r.curMonthFirst15)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceCurFirst15 || 0).toFixed(1)}%</div>
                </td>
                <td>
                  <div>{formatINR(r.day3)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceDay3 || 0).toFixed(1)}%</div>
                </td>
                <td>
                  <div>{formatINR(r.day2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceDay2 || 0).toFixed(1)}%</div>
                </td>
                <td>
                  <div>{formatINR(r.day1)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(r.salienceDay1 || 0).toFixed(1)}%</div>
                </td>
                <td style={{ fontWeight: 'bold' }}>
                  {formatINR(r.estSpends)}
                </td>
                <td>
                  {renderPct(r.vsAvg3Months)}
                </td>
                <td>
                  {renderPct(r.vsLastMonth)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Product Spends (Google)</h1>
        <DaysCountBadge />
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input-field"
          style={{ minWidth: '150px' }}
        >
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <button
          onClick={generateReport}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? '⏳ Loading...' : '🔄 Generate Report'}
        </button>

        {lastUpdated && <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginLeft: 'auto' }}>Last updated: {lastUpdated}</span>}
      </div>

      {error && <div style={{ color: 'var(--danger-color)', marginBottom: '16px', padding: '16px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }}>Error: {error}</div>}

      {data && <ProductSpendsTable data={data} selectedCategory={selectedCategory} />}
    </div>
  );
}

export default function ProductSpendsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
