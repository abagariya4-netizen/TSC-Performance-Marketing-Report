'use client';
import React, { useState, useEffect } from 'react';
import DaysCountBadge from '@/components/DaysCountBadge';

const CATEGORIES = ['All', 'Mattress', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];
const FUNNELS = ['All', 'Top', 'Mid', 'Bottom', 'Growth'];

const fmtINR = (val: number) => '₹' + Math.round(val).toLocaleString('en-IN');
const fmtVal = (val: number) => Math.round(val).toLocaleString('en-IN');
const fmtFloat = (val: number) => val.toFixed(2);
const fmtPctStr = (val: number) => {
  if (!isFinite(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return prefix + val.toFixed(2) + '%';
};

const renderVs = (val: number) => {
  if (!isFinite(val)) return <span>0.00%</span>;
  const color = val > 0 ? '#48bb78' : val < 0 ? '#fc8181' : 'inherit';
  return <span style={{ color }}>{fmtPctStr(val)}</span>;
};

export default function FunnelLevelPerformance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('All');
  const [funnel, setFunnel] = useState('All');
  
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
      const qs = new URLSearchParams({ category, funnel, startDate, endDate });
      const res = await fetch(`/api/funnel-level-performance?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [category, funnel, startDate, endDate]);

  const exportCSV = () => {
    if (!data) return;
    
    const headers = [
      'Campaign Name',
      'Amount Spent Mar', 'Amount Spent Apr', 'Amount Spent May', 'Amount Spent Jun',
      'Category ROAS Mar', 'Category ROAS Apr', 'Category ROAS May', 'Category ROAS Jun',
      'Overall ROAS Mar', 'Overall ROAS Apr', 'Overall ROAS May', 'Overall ROAS Jun',
      'CPM Mar', 'CPM Apr', 'CPM May', 'CPM Jun',
      'CPW Mar', 'CPW Apr', 'CPW May', 'CPW Jun',
      'Walk-in (Absolute) Mar', 'Walk-in (Absolute) Apr', 'Walk-in (Absolute) May', 'Walk-in (Absolute) Jun',
      'CTR Mar', 'CTR Apr', 'CTR May', 'CTR Jun',
      'CPC Mar', 'CPC Apr', 'CPC May', 'CPC Jun',
      'LC to LP% Mar', 'LC to LP% Apr', 'LC to LP% May', 'LC to LP% Jun',
      'LC Mar', 'LC Apr', 'LC May', 'LC Jun',
      'LP Mar', 'LP Apr', 'LP May', 'LP Jun',
      'Impressions Mar', 'Impressions Apr', 'Impressions May', 'Impressions Jun',
      'Vs Last Month (Spend)', 'Vs Last Month (Category ROAS)', 'Vs Last Month (Overall ROAS)', 'Vs Last Month (CPM)', 'Vs Last Month (CPW)', 'Vs Last Month (Walk-in)', 'Vs Last Month (CTR)', 'Vs Last Month (CPC)', 'Vs Last Month (LC to LP%)', 'Vs Last Month (LC)', 'Vs Last Month (LP)', 'Vs Last Month (Impressions)',
      'Vs Avg 3M (Spend)', 'Vs Avg 3M (Category ROAS)', 'Vs Avg 3M (Overall ROAS)', 'Vs Avg 3M (CPM)', 'Vs Avg 3M (CPW)', 'Vs Avg 3M (Walk-in)', 'Vs Avg 3M (CTR)', 'Vs Avg 3M (CPC)', 'Vs Avg 3M (LC to LP%)', 'Vs Avg 3M (LC)', 'Vs Avg 3M (LP)', 'Vs Avg 3M (Impressions)'
    ];

    const rows = data.campaigns.map((c: any) => [
      c.name,
      c.mar.spend, c.apr.spend, c.may.spend, c.jun.spend,
      c.mar.categoryRoas, c.apr.categoryRoas, c.may.categoryRoas, c.jun.categoryRoas,
      c.mar.overallRoas, c.apr.overallRoas, c.may.overallRoas, c.jun.overallRoas,
      c.mar.cpm, c.apr.cpm, c.may.cpm, c.jun.cpm,
      c.mar.cpw, c.apr.cpw, c.may.cpw, c.jun.cpw,
      c.mar.walkin, c.apr.walkin, c.may.walkin, c.jun.walkin,
      c.mar.ctr, c.apr.ctr, c.may.ctr, c.jun.ctr,
      c.mar.cpc, c.apr.cpc, c.may.cpc, c.jun.cpc,
      c.mar.lcToLp, c.apr.lcToLp, c.may.lcToLp, c.jun.lcToLp,
      c.mar.lc, c.apr.lc, c.may.lc, c.jun.lc,
      c.mar.lp, c.apr.lp, c.may.lp, c.jun.lp,
      c.mar.impressions, c.apr.impressions, c.may.impressions, c.jun.impressions,
      c.vsLastMonth.spend, c.vsLastMonth.categoryRoas, c.vsLastMonth.overallRoas, c.vsLastMonth.cpm, c.vsLastMonth.cpw, c.vsLastMonth.walkin, c.vsLastMonth.ctr, c.vsLastMonth.cpc, c.vsLastMonth.lcToLp, c.vsLastMonth.lc, c.vsLastMonth.lp, c.vsLastMonth.impressions,
      c.vsAvg3M.spend, c.vsAvg3M.categoryRoas, c.vsAvg3M.overallRoas, c.vsAvg3M.cpm, c.vsAvg3M.cpw, c.vsAvg3M.walkin, c.vsAvg3M.ctr, c.vsAvg3M.cpc, c.vsAvg3M.lcToLp, c.vsAvg3M.lc, c.vsAvg3M.lp, c.vsAvg3M.impressions
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Funnel_Level_Performance_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Funnel Level Performance (Meta)</h1>
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
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Funnel</label>
          <select value={funnel} onChange={e => setFunnel(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #333' }}>
            {FUNNELS.map(c => <option key={c} value={c}>{c}</option>)}
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
                <th rowSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Campaign Name</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Category ROAS</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Overall ROAS</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPM</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPW</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Walk-in (Absolute)</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CTR</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPC</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LC to LP%</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LC</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LP</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Impressions</th>
                <th colSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '8px', textAlign: 'center' }}>Comparison</th>
              </tr>
              <tr>
                {/* 12 Metric blocks x 4 months = 48 headers */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                  </React.Fragment>
                ))}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vs Last Month</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px' }}>Vs Avg 3M</th>
              </tr>
            </thead>
            <tbody>
              {data?.campaigns.map((c: any, i: number) => {
                const bg = i % 2 === 0 ? '#1a1d27' : '#1f2333';
                return (
                  <tr key={c.name} style={{ background: bg, borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #333', background: bg, position: 'sticky', left: 0 }}>{c.name}</td>
                    
                    {/* Spend */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.mar.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.apr.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.may.spend)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(c.jun.spend)}</td>
                    
                    {/* Category ROAS */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.categoryRoas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.categoryRoas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.categoryRoas)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.categoryRoas)}</td>

                    {/* Overall ROAS */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.overallRoas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.overallRoas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.overallRoas)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.overallRoas)}</td>

                    {/* CPM */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.cpm)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.cpm)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.cpm)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.cpm)}</td>

                    {/* CPW */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.cpw)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.cpw)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.cpw)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.cpw)}</td>

                    {/* Walk-in */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.mar.walkin)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.apr.walkin)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.may.walkin)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(c.jun.walkin)}</td>

                    {/* CTR */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.ctr)}%</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.ctr)}%</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.ctr)}%</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.ctr)}%</td>

                    {/* CPC */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.cpc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.cpc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.cpc)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.cpc)}</td>

                    {/* LC to LP% */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.lcToLp)}%</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.lcToLp)}%</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.lcToLp)}%</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(c.jun.lcToLp)}%</td>

                    {/* LC */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.mar.lc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.apr.lc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.may.lc)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(c.jun.lc)}</td>

                    {/* LP */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.mar.lp)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.apr.lp)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.may.lp)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(c.jun.lp)}</td>

                    {/* Impressions */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.mar.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.apr.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.may.impressions)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(c.jun.impressions)}</td>

                    {/* Comparison */}
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Spend: {renderVs(c.vsLastMonth.spend)}</div>
                        <div>Cat ROAS: {renderVs(c.vsLastMonth.categoryRoas)}</div>
                        <div>Ovr ROAS: {renderVs(c.vsLastMonth.overallRoas)}</div>
                        <div>CPM: {renderVs(c.vsLastMonth.cpm)}</div>
                        <div>CPW: {renderVs(c.vsLastMonth.cpw)}</div>
                        <div>Walkin: {renderVs(c.vsLastMonth.walkin)}</div>
                        <div>CTR: {renderVs(c.vsLastMonth.ctr)}</div>
                        <div>CPC: {renderVs(c.vsLastMonth.cpc)}</div>
                        <div>LC-LP%: {renderVs(c.vsLastMonth.lcToLp)}</div>
                        <div>LC: {renderVs(c.vsLastMonth.lc)}</div>
                        <div>LP: {renderVs(c.vsLastMonth.lp)}</div>
                        <div>Impr: {renderVs(c.vsLastMonth.impressions)}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Spend: {renderVs(c.vsAvg3M.spend)}</div>
                        <div>Cat ROAS: {renderVs(c.vsAvg3M.categoryRoas)}</div>
                        <div>Ovr ROAS: {renderVs(c.vsAvg3M.overallRoas)}</div>
                        <div>CPM: {renderVs(c.vsAvg3M.cpm)}</div>
                        <div>CPW: {renderVs(c.vsAvg3M.cpw)}</div>
                        <div>Walkin: {renderVs(c.vsAvg3M.walkin)}</div>
                        <div>CTR: {renderVs(c.vsAvg3M.ctr)}</div>
                        <div>CPC: {renderVs(c.vsAvg3M.cpc)}</div>
                        <div>LC-LP%: {renderVs(c.vsAvg3M.lcToLp)}</div>
                        <div>LC: {renderVs(c.vsAvg3M.lc)}</div>
                        <div>LP: {renderVs(c.vsAvg3M.lp)}</div>
                        <div>Impr: {renderVs(c.vsAvg3M.impressions)}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {data?.total && (
              <tfoot>
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #333', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #333', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  
                  {/* Spend */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.spend)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(data.total.jun.spend)}</td>
                  
                  {/* Category ROAS */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.categoryRoas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.categoryRoas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.categoryRoas)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.categoryRoas)}</td>

                  {/* Overall ROAS */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.overallRoas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.overallRoas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.overallRoas)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.overallRoas)}</td>

                  {/* CPM */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.cpm)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.cpm)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.cpm)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.cpm)}</td>

                  {/* CPW */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.cpw)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.cpw)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.cpw)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.cpw)}</td>

                  {/* Walk-in */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.walkin)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.walkin)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.walkin)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(data.total.jun.walkin)}</td>

                  {/* CTR */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.ctr)}%</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.ctr)}%</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.ctr)}%</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.ctr)}%</td>

                  {/* CPC */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.cpc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.cpc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.cpc)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.cpc)}</td>

                  {/* LC to LP% */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.lcToLp)}%</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.lcToLp)}%</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.lcToLp)}%</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtFloat(data.total.jun.lcToLp)}%</td>

                  {/* LC */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.lc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.lc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.lc)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(data.total.jun.lc)}</td>

                  {/* LP */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.lp)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.lp)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.lp)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(data.total.jun.lp)}</td>

                  {/* Impressions */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.impressions)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(data.total.jun.impressions)}</td>

                  {/* Comparison */}
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Spend: {renderVs(data.total.vsLastMonth.spend)}</div>
                      <div>Cat ROAS: {renderVs(data.total.vsLastMonth.categoryRoas)}</div>
                      <div>Ovr ROAS: {renderVs(data.total.vsLastMonth.overallRoas)}</div>
                      <div>CPM: {renderVs(data.total.vsLastMonth.cpm)}</div>
                      <div>CPW: {renderVs(data.total.vsLastMonth.cpw)}</div>
                      <div>Walkin: {renderVs(data.total.vsLastMonth.walkin)}</div>
                      <div>CTR: {renderVs(data.total.vsLastMonth.ctr)}</div>
                      <div>CPC: {renderVs(data.total.vsLastMonth.cpc)}</div>
                      <div>LC-LP%: {renderVs(data.total.vsLastMonth.lcToLp)}</div>
                      <div>LC: {renderVs(data.total.vsLastMonth.lc)}</div>
                      <div>LP: {renderVs(data.total.vsLastMonth.lp)}</div>
                      <div>Impr: {renderVs(data.total.vsLastMonth.impressions)}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Spend: {renderVs(data.total.vsAvg3M.spend)}</div>
                      <div>Cat ROAS: {renderVs(data.total.vsAvg3M.categoryRoas)}</div>
                      <div>Ovr ROAS: {renderVs(data.total.vsAvg3M.overallRoas)}</div>
                      <div>CPM: {renderVs(data.total.vsAvg3M.cpm)}</div>
                      <div>CPW: {renderVs(data.total.vsAvg3M.cpw)}</div>
                      <div>Walkin: {renderVs(data.total.vsAvg3M.walkin)}</div>
                      <div>CTR: {renderVs(data.total.vsAvg3M.ctr)}</div>
                      <div>CPC: {renderVs(data.total.vsAvg3M.cpc)}</div>
                      <div>LC-LP%: {renderVs(data.total.vsAvg3M.lcToLp)}</div>
                      <div>LC: {renderVs(data.total.vsAvg3M.lc)}</div>
                      <div>LP: {renderVs(data.total.vsAvg3M.lp)}</div>
                      <div>Impr: {renderVs(data.total.vsAvg3M.impressions)}</div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
