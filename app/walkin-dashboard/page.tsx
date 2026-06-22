'use client';
import React, { useState, useEffect } from 'react';
import DaysCountBadge from '@/components/DaysCountBadge';

const CATEGORIES = ['All', 'Mattress', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];
const DAY_TYPES = ['All', 'Weekday', 'Weekend'];

const fmtINR = (val: number) => '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal = (val: number) => Math.round(Number(val) || 0).toLocaleString('en-IN');
const fmtFloat = (val: number) => (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WalkinDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('All');
  const [dayType, setDayType] = useState('All');
  
  // Date Range (default June 1 to yesterday)
  const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const today = new Date(istString);
  const yday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  
  const defStart = '2026-06-01'; // Default as requested
  const defEnd = `${yday.getFullYear()}-${String(yday.getMonth()+1).padStart(2,'0')}-${String(yday.getDate()).padStart(2,'0')}`;
  
  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate] = useState(defEnd);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ category, dayType, startDate, endDate });
      const res = await fetch(`/api/walkin-dashboard?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.funnels) {
        json.funnels.sort((a: any, b: any) => (b.jun?.spend || 0) - (a.jun?.spend || 0));
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [category, dayType, startDate, endDate]);

  const exportCSV = () => {
    if (!data) return;
    
    const headers = [
      'Funnel',
      'CPW Mar', 'CPW Apr', 'CPW May', 'CPW Jun',
      'Amount Spent Mar', 'Amount Spent Apr', 'Amount Spent May', 'Amount Spent Jun',
      'Walkin Mar', 'Walkin Apr', 'Walkin May', 'Walkin Jun'
    ];

    const rows = data.funnels.map((f: any) => [
      f.funnel,
      f.mar.cpw, f.apr.cpw, f.may.cpw, f.jun.cpw,
      f.mar.spend, f.apr.spend, f.may.spend, f.jun.spend,
      f.mar.walkin, f.apr.walkin, f.may.walkin, f.jun.walkin
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Walkin_Dashboard_Meta_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Walkin Dashboard (Meta)</h1>
          <DaysCountBadge />
        </div>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #333' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Day Type</label>
          <select value={dayType} onChange={e => setDayType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #333' }}>
            {DAY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #333' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #333' }} />
        </div>
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px' }}>{error}</div>}

      {loading && !data ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Funnel</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPW</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Walkin</th>
              </tr>
              <tr>
                {/* 3 Metric blocks x 4 months = 12 headers */}
                {Array.from({ length: 3 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.funnels.map((f: any, i: number) => {
                const bg = i % 2 === 0 ? '#1a1d27' : '#1f2333';
                return (
                  <tr key={f.funnel} style={{ background: bg, borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #333', background: bg, position: 'sticky', left: 0 }}>{f.funnel}</td>
                    
                    {/* CPW */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(f.mar.cpw)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(f.apr.cpw)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(f.may.cpw)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(f.jun.cpw)}</td>

                    {/* Spend */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(f.mar.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(f.apr.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(f.may.spend)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(f.jun.spend)}</td>

                    {/* Walkin */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(f.mar.walkin)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(f.apr.walkin)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(f.may.walkin)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(f.jun.walkin)}</td>
                  </tr>
                );
              })}
            </tbody>
            {data?.total && (
              <tfoot>
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #333', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #333', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  
                  {/* CPW */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.cpw)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.cpw)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.cpw)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(data.total.jun.cpw)}</td>

                  {/* Spend */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.spend)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(data.total.jun.spend)}</td>

                  {/* Walkin */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.walkin)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.walkin)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.walkin)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(data.total.jun.walkin)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
