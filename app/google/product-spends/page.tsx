'use client';
import React, { useState, Suspense } from 'react';
import { formatINR } from '@/lib/calculations';

interface ProductRow {
  name: string;
  mar: number;
  apr: number;
  may: number;
  jun1_15: number;
  jun16: number;
  jun17: number;
  jun18: number;
  salienceMar: number;
  salienceApr: number;
  salienceMay: number;
  salienceJun1_15: number;
  salienceJun16: number;
  salienceJun17: number;
  salienceJun18: number;
  mtd: number;
  estSpends: number;
  vsAvg3Months: number | null;
  vsMay: number | null;
}

interface ReportData {
  categories: Record<string, { products: ProductRow[] }>;
  dateRanges: Record<string, { start: string, end: string }>;
  daysRemaining: number;
  daysPassed: number;
}

const CATEGORIES = ['Mattress', 'Chair', 'Desk', 'Accessories', 'Foot Massager', 'Bed', 'Elite', 'Sofa'];

function ProductSpendsTable({ data, selectedCategory }: { data: ReportData, selectedCategory: string }) {
  const categoryData = data.categories[selectedCategory] || { products: [] };
  const rows = categoryData.products;

  const exportCSV = () => {
    const headers = [
      'Product', 
      'Mar Amount', 'Mar Salience %', 
      'Apr Amount', 'Apr Salience %', 
      'May Amount', 'May Salience %', 
      'Jun(1-15) Amount', 'Jun(1-15) Salience %', 
      '16 Jun Amount', '16 Jun Salience %',
      '17 Jun Amount', '17 Jun Salience %',
      '18 Jun Amount', '18 Jun Salience %',
      'MTD (1-18 Jun)', 'Est. Spends', 'vs Avg 3 Months %', 'vs May %'
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    rows.forEach(r => {
      lines.push([
        `"${r.name}"`,
        r.mar, r.salienceMar,
        r.apr, r.salienceApr,
        r.may, r.salienceMay,
        r.jun1_15, r.salienceJun1_15,
        r.jun16, r.salienceJun16,
        r.jun17, r.salienceJun17,
        r.jun18, r.salienceJun18,
        r.mtd, r.estSpends,
        r.vsAvg3Months !== null ? r.vsAvg3Months : '',
        r.vsMay !== null ? r.vsMay : ''
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
            <th style={{ padding: '10px 12px' }}>Mar<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>Apr<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>May<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>Jun(1-15)<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>16 Jun<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>17 Jun<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>18 Jun<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(Amt | Salience)</span></th>
            <th style={{ padding: '10px 12px' }}>Est. Spends<br/><span style={{fontSize: '10px', fontWeight: 'normal'}}>(MTD + 18Jun×Remaining)</span></th>
            <th style={{ padding: '10px 12px' }}>vs Avg 3 Months</th>
            <th style={{ padding: '10px 12px' }}>vs May</th>
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
                <div>{formatINR(r.mar)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceMar || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.apr)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceApr || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.may)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceMay || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.jun1_15)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceJun1_15 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.jun16)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceJun16 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.jun17)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceJun17 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                <div>{formatINR(r.jun18)}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{(r.salienceJun18 || 0).toFixed(1)}%</div>
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', fontWeight: 'bold' }}>
                {formatINR(r.estSpends)}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                {renderPct(r.vsAvg3Months)}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>
                {renderPct(r.vsMay)}
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
    <main style={{ color: 'white', padding: '0 24px 24px 24px', fontFamily: 'Inter, sans-serif' }}>
      
      <div style={{ background: '#1a3a2a', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 600 }}>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', background: '#1a1d27', color: 'white', border: '1px solid #4a5568' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button onClick={generateReport} disabled={loading}
          style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: '#e8733a', color: 'white', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
        </button>
      </div>

      {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {data && (
        <ProductSpendsTable data={data} selectedCategory={selectedCategory} />
      )}

      {lastUpdated && (
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
          Last updated: {lastUpdated}
        </div>
      )}
    </main>
  );
}

export default function GoogleProductSpendsPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '24px' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
