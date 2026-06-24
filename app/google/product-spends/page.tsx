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
  cpcMonth1: number; ctrMonth1: number; roasMonth1: number;
  cpcMonth2: number; ctrMonth2: number; roasMonth2: number;
  cpcMonth3: number; ctrMonth3: number; roasMonth3: number;
  cpcCurMonth: number; ctrCurMonth: number; roasCurMonth: number;
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
  variants?: Omit<ProductRow, 'variants'>[];
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
  categories: Record<string, { products: ProductRow[], totals?: any }>;
  dateRanges: Record<string, { start: string, end: string }>;
  daysRemaining: number;
  daysPassed: number;
  labels: ReportLabels;
}

const fmtFloat = (val: number | null) => (val === null || !isFinite(val)) ? '0.00' : Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPctStr = (val: number | null) => (val === null || !isFinite(val)) ? '0.00%' : Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const CATEGORIES = ['Mattress', 'Chair', 'Desk', 'Accessories', 'Foot Massager', 'Bed', 'Elite', 'Sofa'];

function ProductSpendsTable({ data, selectedCategory }: { data: ReportData, selectedCategory: string }) {
  const categoryData = data.categories[selectedCategory] || { products: [] };
  const rows = categoryData.products;
  const totals = categoryData.totals;
  const labels = data.labels;
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleProduct = (name: string) => {
    const next = new Set(expandedProducts);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedProducts(next);
  };

  const exportCSV = () => {
    const headers = [
      'Product',
      `${labels.month1} Spend`, `${labels.month1} Salience %`, `${labels.month1} CPC`, `${labels.month1} CTR`, `${labels.month1} ROAS`,
      `${labels.month2} Spend`, `${labels.month2} Salience %`, `${labels.month2} CPC`, `${labels.month2} CTR`, `${labels.month2} ROAS`,
      `${labels.month3} Spend`, `${labels.month3} Salience %`, `${labels.month3} CPC`, `${labels.month3} CTR`, `${labels.month3} ROAS`,
      `${labels.curMonthFirst15} Spend`, `${labels.curMonthFirst15} Salience %`, `${labels.curMonthFirst15} CPC`, `${labels.curMonthFirst15} CTR`, `${labels.curMonthFirst15} ROAS`,
      `${labels.day3} Spend`, `${labels.day3} Salience %`,
      `${labels.day2} Spend`, `${labels.day2} Salience %`,
      `${labels.day1} Spend`, `${labels.day1} Salience %`,
      'MTD', 'Est. Spends', 'vs Avg 3 Months %', `vs ${labels.lastMonth} %`
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    rows.forEach(r => {
      const getRowData = (row: any) => [
        `"${row.name}"`,
        row.month1, row.salienceMonth1, row.cpcMonth1, row.ctrMonth1, row.roasMonth1,
        row.month2, row.salienceMonth2, row.cpcMonth2, row.ctrMonth2, row.roasMonth2,
        row.month3, row.salienceMonth3, row.cpcMonth3, row.ctrMonth3, row.roasMonth3,
        row.curMonthFirst15, row.salienceCurFirst15, row.cpcCurMonth, row.ctrCurMonth, row.roasCurMonth,
        row.day3, row.salienceDay3,
        row.day2, row.salienceDay2,
        row.day1, row.salienceDay1,
        row.mtd, row.estSpends,
        row.vsAvg3Months !== null ? row.vsAvg3Months : '',
        row.vsLastMonth !== null ? row.vsLastMonth : ''
      ].join(',');
      
      lines.push(getRowData(r));
      if (r.variants) {
        r.variants.forEach((v: any) => {
          lines.push(getRowData(v));
        });
      }
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
              <th rowSpan={2} style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', minWidth: '200px' }}>Product ({selectedCategory})</th>
              <th colSpan={5} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.month1}</th>
              <th colSpan={5} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.month2}</th>
              <th colSpan={5} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.month3}</th>
              <th colSpan={5} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.curMonthFirst15}</th>
              <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.day3}</th>
              <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.day2}</th>
              <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{labels.day1}</th>
              <th rowSpan={2} style={{ textAlign: 'center' }}>Est. Spends<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(MTD + {labels.day1}×Remaining)</span></th>
              <th rowSpan={2} style={{ textAlign: 'center' }}>vs Avg 3 Months</th>
              <th rowSpan={2} style={{ textAlign: 'center' }}>vs {labels.lastMonth}</th>
            </tr>
            <tr>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500 }}>Salience</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CPC</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CTR</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>ROAS</th>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500 }}>Salience</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CPC</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CTR</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>ROAS</th>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500 }}>Salience</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CPC</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CTR</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>ROAS</th>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500 }}>Salience</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CPC</th><th style={{ fontSize: '11px', fontWeight: 500 }}>CTR</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>ROAS</th>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>Salience</th>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>Salience</th>
              <th style={{ fontSize: '11px', fontWeight: 500 }}>Spend</th><th style={{ fontSize: '11px', fontWeight: 500, borderRight: '1px solid var(--border-color)' }}>Salience</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={29} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No products found in this category.</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <React.Fragment key={r.name}>
                <tr>
                  <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    {r.variants && r.variants.length > 0 ? (
                      <button 
                        onClick={() => toggleProduct(r.name)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginRight: '8px', fontSize: '10px' }}
                      >
                        {expandedProducts.has(r.name) ? '▼' : '▶'}
                      </button>
                    ) : (
                      <span style={{ display: 'inline-block', width: '18px', marginRight: '8px' }}></span>
                    )}
                    {r.name}
                  </td>
                  <td>{formatINR(r.month1)}</td><td>{fmtPctStr(r.salienceMonth1)}</td><td>{formatINR(r.cpcMonth1)}</td><td>{fmtPctStr(r.ctrMonth1)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(r.roasMonth1)}</td>
                  <td>{formatINR(r.month2)}</td><td>{fmtPctStr(r.salienceMonth2)}</td><td>{formatINR(r.cpcMonth2)}</td><td>{fmtPctStr(r.ctrMonth2)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(r.roasMonth2)}</td>
                  <td>{formatINR(r.month3)}</td><td>{fmtPctStr(r.salienceMonth3)}</td><td>{formatINR(r.cpcMonth3)}</td><td>{fmtPctStr(r.ctrMonth3)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(r.roasMonth3)}</td>
                  <td>{formatINR(r.curMonthFirst15)}</td><td>{fmtPctStr(r.salienceCurFirst15)}</td><td>{formatINR(r.cpcCurMonth)}</td><td>{fmtPctStr(r.ctrCurMonth)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(r.roasCurMonth)}</td>
                  
                  <td>{formatINR(r.day3)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(r.salienceDay3)}</td>
                  <td>{formatINR(r.day2)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(r.salienceDay2)}</td>
                  <td>{formatINR(r.day1)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(r.salienceDay1)}</td>
                  
                  <td style={{ fontWeight: 'bold' }}>{formatINR(r.estSpends)}</td>
                  <td>{renderPct(r.vsAvg3Months)}</td>
                  <td>{renderPct(r.vsLastMonth)}</td>
                </tr>
                {expandedProducts.has(r.name) && r.variants && r.variants.map((v, vi) => (
                  <tr key={v.name} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', paddingLeft: '32px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      ↳ {v.name}
                    </td>
                    <td style={{ fontSize: '13px' }}>{formatINR(v.month1)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtPctStr(v.salienceMonth1)}</td><td style={{ fontSize: '13px' }}>{formatINR(v.cpcMonth1)}</td><td style={{ fontSize: '13px' }}>{fmtPctStr(v.ctrMonth1)}</td><td style={{ fontSize: '13px', borderRight: '1px solid var(--border-color)' }}>{fmtFloat(v.roasMonth1)}</td>
                    <td style={{ fontSize: '13px' }}>{formatINR(v.month2)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtPctStr(v.salienceMonth2)}</td><td style={{ fontSize: '13px' }}>{formatINR(v.cpcMonth2)}</td><td style={{ fontSize: '13px' }}>{fmtPctStr(v.ctrMonth2)}</td><td style={{ fontSize: '13px', borderRight: '1px solid var(--border-color)' }}>{fmtFloat(v.roasMonth2)}</td>
                    <td style={{ fontSize: '13px' }}>{formatINR(v.month3)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtPctStr(v.salienceMonth3)}</td><td style={{ fontSize: '13px' }}>{formatINR(v.cpcMonth3)}</td><td style={{ fontSize: '13px' }}>{fmtPctStr(v.ctrMonth3)}</td><td style={{ fontSize: '13px', borderRight: '1px solid var(--border-color)' }}>{fmtFloat(v.roasMonth3)}</td>
                    <td style={{ fontSize: '13px' }}>{formatINR(v.curMonthFirst15)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmtPctStr(v.salienceCurFirst15)}</td><td style={{ fontSize: '13px' }}>{formatINR(v.cpcCurMonth)}</td><td style={{ fontSize: '13px' }}>{fmtPctStr(v.ctrCurMonth)}</td><td style={{ fontSize: '13px', borderRight: '1px solid var(--border-color)' }}>{fmtFloat(v.roasCurMonth)}</td>
                    
                    <td style={{ fontSize: '13px' }}>{formatINR(v.day3)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(v.salienceDay3)}</td>
                    <td style={{ fontSize: '13px' }}>{formatINR(v.day2)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(v.salienceDay2)}</td>
                    <td style={{ fontSize: '13px' }}>{formatINR(v.day1)}</td><td style={{ fontSize: '13px', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(v.salienceDay1)}</td>
                    
                    <td></td><td></td><td></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {totals && rows.length > 0 && (
              <tr style={{ background: 'rgba(232, 115, 58, 0.15)', fontWeight: 'bold' }}>
                <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>Total</td>
                <td>{formatINR(totals.month1)}</td><td>100.00%</td><td>{formatINR(totals.cpcMonth1)}</td><td>{fmtPctStr(totals.ctrMonth1)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(totals.roasMonth1)}</td>
                <td>{formatINR(totals.month2)}</td><td>100.00%</td><td>{formatINR(totals.cpcMonth2)}</td><td>{fmtPctStr(totals.ctrMonth2)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(totals.roasMonth2)}</td>
                <td>{formatINR(totals.month3)}</td><td>100.00%</td><td>{formatINR(totals.cpcMonth3)}</td><td>{fmtPctStr(totals.ctrMonth3)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(totals.roasMonth3)}</td>
                <td>{formatINR(totals.curMonthFirst15)}</td><td>100.00%</td><td>{formatINR(totals.cpcCurMonth)}</td><td>{fmtPctStr(totals.ctrCurMonth)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>{fmtFloat(totals.roasCurMonth)}</td>
                
                <td>{formatINR(totals.day3)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>100.00%</td>
                <td>{formatINR(totals.day2)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>100.00%</td>
                <td>{formatINR(totals.day1)}</td><td style={{ borderRight: '1px solid var(--border-color)' }}>100.00%</td>
                
                <td>{formatINR(totals.estSpends)}</td>
                <td>{renderPct(totals.vsAvg3Months)}</td>
                <td>{renderPct(totals.vsLastMonth)}</td>
              </tr>
            )}
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
