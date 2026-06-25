'use client';
import React, { useState, Suspense } from 'react';
import { formatINR } from '@/lib/calculations';
import DaysCountBadge from '@/components/DaysCountBadge';
import DateRangePicker from '@/components/DateRangePicker';
import { getDefaultMonths } from '@/lib/dateRangeUtils';

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
  cpcDay3: number; ctrDay3: number; roasDay3: number;
  cpcDay2: number; ctrDay2: number; roasDay2: number;
  cpcDay1: number; ctrDay1: number; roasDay1: number;
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

const CATEGORIES = ['All', 'Mattress', 'Chair', 'Desk', 'Accessories', 'Foot Massager', 'Bed', 'Elite', 'Sofa'];

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

  const today = new Date();
  const d1 = new Date(today); d1.setDate(today.getDate() - 1);
  const d2 = new Date(today); d2.setDate(today.getDate() - 2);
  const d3 = new Date(today); d3.setDate(today.getDate() - 3);
  const d4 = new Date(today); d4.setDate(today.getDate() - 4);

  const getMonthStr = (d: Date) => d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  
  const mtdLabel = `${getMonthStr(d4)} (${d4.getDate() === 1 ? '1' : `1-${d4.getDate()}`})`;
  const day3Label = `${d3.getDate()} ${getMonthStr(d3)}`;
  const day2Label = `${d2.getDate()} ${getMonthStr(d2)}`;
  const day1Label = `${d1.getDate()} ${getMonthStr(d1)}`;

  const exportCSV = () => {
    const headers = [
      'Product',
      `${labels.month1} Spend`, `${labels.month2} Spend`, `${labels.month3} Spend`, `${mtdLabel} Spend`, `${day3Label} Spend`, `${day2Label} Spend`, `${day1Label} Spend`,
      `${labels.month1} Salience %`, `${labels.month2} Salience %`, `${labels.month3} Salience %`, `${mtdLabel} Salience %`, `${day3Label} Salience %`, `${day2Label} Salience %`, `${day1Label} Salience %`,
      `${labels.month1} CPC`, `${labels.month2} CPC`, `${labels.month3} CPC`, `${mtdLabel} CPC`, `${day3Label} CPC`, `${day2Label} CPC`, `${day1Label} CPC`,
      `${labels.month1} CTR`, `${labels.month2} CTR`, `${labels.month3} CTR`, `${mtdLabel} CTR`, `${day3Label} CTR`, `${day2Label} CTR`, `${day1Label} CTR`,
      `${labels.month1} ROAS`, `${labels.month2} ROAS`, `${labels.month3} ROAS`, `${mtdLabel} ROAS`, `${day3Label} ROAS`, `${day2Label} ROAS`, `${day1Label} ROAS`,
      'MTD', 'Est. Spends'
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    rows.forEach(r => {
      const getRowData = (row: any) => [
        `"${row.name}"`,
        row.month1, row.month2, row.month3, row.curMonthFirst15, row.day3, row.day2, row.day1,
        row.cpcMonth1, row.cpcMonth2, row.cpcMonth3, row.cpcCurMonth, row.cpcDay3, row.cpcDay2, row.cpcDay1,
        row.ctrMonth1, row.ctrMonth2, row.ctrMonth3, row.ctrCurMonth, row.ctrDay3, row.ctrDay2, row.ctrDay1,
        row.roasMonth1, row.roasMonth2, row.roasMonth3, row.roasCurMonth, row.roasDay3, row.roasDay2, row.roasDay1,
        row.mtd, row.estSpends
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

  const renderDash = () => <span style={{ color: 'var(--text-secondary)' }}>—</span>;

  const subHeaderStyle = { fontSize: '11px', fontWeight: 500, textAlign: 'center' as const, backgroundColor: '#1A2336' };
  const subHeaderRightStyle = { ...subHeaderStyle, borderRight: '1px solid var(--border-color)' };

  const renderDataRow = (r: any, isVariant: boolean) => {
    const bg = isVariant ? 'rgba(255,255,255,0.03)' : 'transparent';
    const stickyBg = isVariant ? '#1e283d' : '#1A2336';
    const nameStyle = isVariant 
      ? { textAlign: 'left' as const, borderRight: '1px solid var(--border-color)', paddingLeft: '32px', fontSize: '13px', color: 'var(--text-secondary)', position: 'sticky' as const, left: 0, zIndex: 10, backgroundColor: stickyBg }
      : { textAlign: 'left' as const, borderRight: '1px solid var(--border-color)', fontWeight: 500, display: 'flex', alignItems: 'center', position: 'sticky' as const, left: 0, zIndex: 10, backgroundColor: stickyBg };
    
    const cellStyle = isVariant ? { fontSize: '13px' } : {};
    const salienceStyle = isVariant ? { fontSize: '13px', color: 'var(--text-secondary)' } : {};

    return (
      <tr key={r.name} style={{ background: bg }}>
        <td style={nameStyle}>
          {!isVariant && r.variants && r.variants.length > 0 ? (
            <button 
              onClick={() => toggleProduct(r.name)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginRight: '8px', fontSize: '10px' }}
            >
              {expandedProducts.has(r.name) ? '▼' : '▶'}
            </button>
          ) : !isVariant ? (
            <span style={{ display: 'inline-block', width: '18px', marginRight: '8px' }}></span>
          ) : null}
          {isVariant ? `↳ ${r.name}` : r.name}
        </td>
        {/* SPEND */}
        <td style={cellStyle}>{formatINR(r.month1)}</td><td style={cellStyle}>{formatINR(r.month2)}</td><td style={cellStyle}>{formatINR(r.month3)}</td><td style={cellStyle}>{formatINR(r.curMonthFirst15)}</td><td style={cellStyle}>{formatINR(r.day3)}</td><td style={cellStyle}>{formatINR(r.day2)}</td><td style={{ ...cellStyle, borderRight: '1px solid var(--border-color)' }}>{formatINR(r.day1)}</td>
        {/* SALIENCE */}
        <td style={salienceStyle}>{fmtPctStr(r.salienceMonth1)}</td><td style={salienceStyle}>{fmtPctStr(r.salienceMonth2)}</td><td style={salienceStyle}>{fmtPctStr(r.salienceMonth3)}</td><td style={salienceStyle}>{fmtPctStr(r.salienceCurFirst15)}</td><td style={salienceStyle}>{fmtPctStr(r.salienceDay3)}</td><td style={salienceStyle}>{fmtPctStr(r.salienceDay2)}</td><td style={{ ...salienceStyle, borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(r.salienceDay1)}</td>
        {/* CPC */}
        <td style={cellStyle}>{formatINR(r.cpcMonth1)}</td><td style={cellStyle}>{formatINR(r.cpcMonth2)}</td><td style={cellStyle}>{formatINR(r.cpcMonth3)}</td><td style={cellStyle}>{formatINR(r.cpcCurMonth)}</td><td style={cellStyle}>{formatINR(r.cpcDay3)}</td><td style={cellStyle}>{formatINR(r.cpcDay2)}</td><td style={{ ...cellStyle, borderRight: '1px solid var(--border-color)' }}>{formatINR(r.cpcDay1)}</td>
        {/* CTR */}
        <td style={cellStyle}>{fmtPctStr(r.ctrMonth1)}</td><td style={cellStyle}>{fmtPctStr(r.ctrMonth2)}</td><td style={cellStyle}>{fmtPctStr(r.ctrMonth3)}</td><td style={cellStyle}>{fmtPctStr(r.ctrCurMonth)}</td><td style={cellStyle}>{fmtPctStr(r.ctrDay3)}</td><td style={cellStyle}>{fmtPctStr(r.ctrDay2)}</td><td style={{ ...cellStyle, borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(r.ctrDay1)}</td>
        {/* ROAS */}
        <td style={cellStyle}>{fmtFloat(r.roasMonth1)}</td><td style={cellStyle}>{fmtFloat(r.roasMonth2)}</td><td style={cellStyle}>{fmtFloat(r.roasMonth3)}</td><td style={cellStyle}>{fmtFloat(r.roasCurMonth)}</td><td style={cellStyle}>{fmtFloat(r.roasDay3)}</td><td style={cellStyle}>{fmtFloat(r.roasDay2)}</td><td style={{ ...cellStyle, borderRight: '1px solid var(--border-color)' }}>{fmtFloat(r.roasDay1)}</td>
        
        <td style={{ ...cellStyle, fontWeight: isVariant ? 'normal' : 'bold', borderRight: '1px solid var(--border-color)' }}>{formatINR(r.estSpends)}</td>
      </tr>
    );
  };

  return (
    <div style={{ marginTop: '16px', marginBottom: '32px' }}>
      <div style={{ marginBottom: '12px', textAlign: 'right' }}>
        <button onClick={exportCSV} className="btn-outline">
          📥 Export CSV
        </button>
      </div>
      <div className="table-wrapper" style={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <table className="modern-table" style={{ minWidth: 'max-content' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
            <tr>
              <th rowSpan={2} style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', minWidth: '200px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: '#1A2336' }}>Product ({selectedCategory})</th>
              <th colSpan={7} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', backgroundColor: '#1A2336' }}>SPEND</th>
              <th colSpan={7} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', backgroundColor: '#1A2336' }}>SALIENCE %</th>
              <th colSpan={7} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', backgroundColor: '#1A2336' }}>CPC</th>
              <th colSpan={7} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', backgroundColor: '#1A2336' }}>CTR</th>
              <th colSpan={7} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)', backgroundColor: '#1A2336' }}>ROAS</th>
              <th rowSpan={2} style={{ textAlign: 'center', backgroundColor: '#1A2336', borderRight: '1px solid var(--border-color)' }}>Est. Spends<br/><span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>(MTD + {day1Label}×Remaining)</span></th>
            </tr>
            <tr>
              {/* SPEND */}
              <th style={subHeaderStyle}>{labels.month1}</th><th style={subHeaderStyle}>{labels.month2}</th><th style={subHeaderStyle}>{labels.month3}</th><th style={subHeaderStyle}>{mtdLabel}</th><th style={subHeaderStyle}>{day3Label}</th><th style={subHeaderStyle}>{day2Label}</th><th style={subHeaderRightStyle}>{day1Label}</th>
              {/* SALIENCE */}
              <th style={subHeaderStyle}>{labels.month1}</th><th style={subHeaderStyle}>{labels.month2}</th><th style={subHeaderStyle}>{labels.month3}</th><th style={subHeaderStyle}>{mtdLabel}</th><th style={subHeaderStyle}>{day3Label}</th><th style={subHeaderStyle}>{day2Label}</th><th style={subHeaderRightStyle}>{day1Label}</th>
              {/* CPC */}
              <th style={subHeaderStyle}>{labels.month1}</th><th style={subHeaderStyle}>{labels.month2}</th><th style={subHeaderStyle}>{labels.month3}</th><th style={subHeaderStyle}>{mtdLabel}</th><th style={subHeaderStyle}>{day3Label}</th><th style={subHeaderStyle}>{day2Label}</th><th style={subHeaderRightStyle}>{day1Label}</th>
              {/* CTR */}
              <th style={subHeaderStyle}>{labels.month1}</th><th style={subHeaderStyle}>{labels.month2}</th><th style={subHeaderStyle}>{labels.month3}</th><th style={subHeaderStyle}>{mtdLabel}</th><th style={subHeaderStyle}>{day3Label}</th><th style={subHeaderStyle}>{day2Label}</th><th style={subHeaderRightStyle}>{day1Label}</th>
              {/* ROAS */}
              <th style={subHeaderStyle}>{labels.month1}</th><th style={subHeaderStyle}>{labels.month2}</th><th style={subHeaderStyle}>{labels.month3}</th><th style={subHeaderStyle}>{mtdLabel}</th><th style={subHeaderStyle}>{day3Label}</th><th style={subHeaderStyle}>{day2Label}</th><th style={subHeaderRightStyle}>{day1Label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={39} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No products found in this category.</td>
              </tr>
            )}
            {rows.map(r => (
              <React.Fragment key={r.name}>
                {renderDataRow(r, false)}
                {expandedProducts.has(r.name) && r.variants && r.variants.map(v => renderDataRow(v, true))}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 20 }}>
            {totals && rows.length > 0 && (
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', position: 'sticky', left: 0, zIndex: 30, backgroundColor: '#281d18' }}>Total</td>
                {/* SPEND */}
                <td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.month1)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.month2)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.month3)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.curMonthFirst15)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.day3)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.day2)}</td><td style={{ backgroundColor: '#281d18', borderRight: '1px solid var(--border-color)' }}>{formatINR(totals.day1)}</td>
                {/* SALIENCE */}
                <td style={{ backgroundColor: '#281d18' }}>100.00%</td><td style={{ backgroundColor: '#281d18' }}>100.00%</td><td style={{ backgroundColor: '#281d18' }}>100.00%</td><td style={{ backgroundColor: '#281d18' }}>100.00%</td><td style={{ backgroundColor: '#281d18' }}>100.00%</td><td style={{ backgroundColor: '#281d18' }}>100.00%</td><td style={{ backgroundColor: '#281d18', borderRight: '1px solid var(--border-color)' }}>100.00%</td>
                {/* CPC */}
                <td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.cpcMonth1)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.cpcMonth2)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.cpcMonth3)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.cpcCurMonth)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.cpcDay3)}</td><td style={{ backgroundColor: '#281d18' }}>{formatINR(totals.cpcDay2)}</td><td style={{ backgroundColor: '#281d18', borderRight: '1px solid var(--border-color)' }}>{formatINR(totals.cpcDay1)}</td>
                {/* CTR */}
                <td style={{ backgroundColor: '#281d18' }}>{fmtPctStr(totals.ctrMonth1)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtPctStr(totals.ctrMonth2)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtPctStr(totals.ctrMonth3)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtPctStr(totals.ctrCurMonth)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtPctStr(totals.ctrDay3)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtPctStr(totals.ctrDay2)}</td><td style={{ backgroundColor: '#281d18', borderRight: '1px solid var(--border-color)' }}>{fmtPctStr(totals.ctrDay1)}</td>
                {/* ROAS */}
                <td style={{ backgroundColor: '#281d18' }}>{fmtFloat(totals.roasMonth1)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtFloat(totals.roasMonth2)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtFloat(totals.roasMonth3)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtFloat(totals.roasCurMonth)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtFloat(totals.roasDay3)}</td><td style={{ backgroundColor: '#281d18' }}>{fmtFloat(totals.roasDay2)}</td><td style={{ backgroundColor: '#281d18', borderRight: '1px solid var(--border-color)' }}>{fmtFloat(totals.roasDay1)}</td>
                <td style={{ backgroundColor: '#281d18', borderRight: '1px solid var(--border-color)' }}>{formatINR(totals.estSpends)}</td>
              </tr>
            )}
          </tfoot>
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const defMonths = getDefaultMonths();
  const [startDate, setStartDate] = useState(defMonths[0].startDate);
  const [endDate, setEndDate] = useState(defMonths[defMonths.length - 1].endDate);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/google-product-spends?endDate=${endDate}`);
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

        <DateRangePicker 
          onApply={(start, end) => {
            setStartDate(new Date(start).toISOString().split('T')[0]);
            setEndDate(new Date(end).toISOString().split('T')[0]);
          }}
          onReset={() => {
            const def = getDefaultMonths();
            setStartDate(def[0].startDate);
            setEndDate(def[def.length - 1].endDate);
          }}
        />

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
