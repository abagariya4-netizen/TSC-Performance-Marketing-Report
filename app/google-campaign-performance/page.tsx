'use client';
import React, { useState, useEffect } from 'react';

const CATEGORIES = ['All', 'Mattress', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];
const CAMPAIGN_TYPES = ['All', 'Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];

const fmtINR = (val: number) => '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal = (val: number) => Math.round(Number(val) || 0).toLocaleString('en-IN');
const fmtFloat = (val: number) => (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPctStr = (val: number) => {
  if (!isFinite(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return prefix + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

const renderVs = (val: number) => {
  if (!isFinite(val)) return <span>0.00%</span>;
  const color = val > 0 ? '#48bb78' : val < 0 ? '#fc8181' : 'inherit';
  return <span style={{ color }}>{fmtPctStr(val)}</span>;
};

export default function GoogleCampaignPerformance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const istString2 = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const today2 = new Date(istString2);
  const yesterday2 = new Date(today2.getFullYear(), today2.getMonth(), today2.getDate() - 1);
  const monthName = yesterday2.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysPassed = yesterday2.getDate();
  const daysTotal = new Date(yesterday2.getFullYear(), yesterday2.getMonth() + 1, 0).getDate();
  const daysRemaining = daysTotal - daysPassed;


  const [category, setCategory] = useState('All');
  const [campaignType, setCampaignType] = useState('Search');
  
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
      const qs = new URLSearchParams({ category, campaignType, startDate, endDate });
      const res = await fetch(`/api/google-campaign-performance?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.campaigns) {
        json.campaigns.sort((a: any, b: any) => (b.jun?.spend || 0) - (a.jun?.spend || 0));
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
  }, [category, campaignType, startDate, endDate]);

  const exportCSV = () => {
    if (!data) return;
    
    const headers = [
      'Campaign Name',
      'Amount Spent Mar', 'Amount Spent Apr', 'Amount Spent May', 'Amount Spent Jun',
      'Overall ROAS Mar', 'Overall ROAS Apr', 'Overall ROAS May', 'Overall ROAS Jun',
      'CPC Mar', 'CPC Apr', 'CPC May', 'CPC Jun',
      'CTR Mar', 'CTR Apr', 'CTR May', 'CTR Jun',
      'Impressions Mar', 'Impressions Apr', 'Impressions May', 'Impressions Jun',
      'Vs Last Month (Spend)', 'Vs Last Month (ROAS)', 'Vs Last Month (CPC)', 'Vs Last Month (CTR)', 'Vs Last Month (Impressions)',
      'Vs Avg 3M (Spend)', 'Vs Avg 3M (ROAS)', 'Vs Avg 3M (CPC)', 'Vs Avg 3M (CTR)', 'Vs Avg 3M (Impressions)'
    ];

    const rows = data.campaigns.map((c: any) => [
      c.name,
      c.mar.spend, c.apr.spend, c.may.spend, c.jun.spend,
      c.mar.roas, c.apr.roas, c.may.roas, c.jun.roas,
      c.mar.cpc, c.apr.cpc, c.may.cpc, c.jun.cpc,
      c.mar.ctr, c.apr.ctr, c.may.ctr, c.jun.ctr,
      c.mar.impressions, c.apr.impressions, c.may.impressions, c.jun.impressions,
      c.vsLastMonth.spend, c.vsLastMonth.roas, c.vsLastMonth.cpc, c.vsLastMonth.ctr, c.vsLastMonth.impressions,
      c.vsAvg3M.spend, c.vsAvg3M.roas, c.vsAvg3M.cpc, c.vsAvg3M.ctr, c.vsAvg3M.impressions
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Campaign_Type_Performance_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Campaign Type Performance (Google)</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
              📅 {monthName} | Day {daysPassed} of {daysTotal} | {daysRemaining} days remaining
            </span>
          </div>
        </div>
        <button 
          onClick={exportCSV}
          style={{ backgroundColor: '#2d3748', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          📥 Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #2d3348' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Campaign Type</label>
          <select value={campaignType} onChange={e => setCampaignType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #2d3348' }}>
            {CAMPAIGN_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #2d3348' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #2d3348' }} />
        </div>
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px' }}>{error}</div>}

      {loading && !data ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #2d3348', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right' }}>
            <thead style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
              <tr>
                <th rowSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Campaign Name</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Overall ROAS</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPC</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CTR</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Impressions</th>
                <th colSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '8px', textAlign: 'center' }}>Comparison</th>
              </tr>
              <tr>
                {/* Spend */}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                {/* ROAS */}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                {/* CPC */}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                {/* CTR */}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                {/* Impressions */}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                {/* Comparison */}
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vs Last Month</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '8px' }}>Vs Avg 3M</th>
              </tr>
            </thead>
            <tbody>
              {data?.campaigns.map((c: any, i: number) => {
                const bg = i % 2 === 0 ? '#1a1d27' : '#1f2333';
                return (
                  <tr key={c.name} style={{ background: bg, borderBottom: '1px solid #2d3348' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', background: bg, position: 'sticky', left: 0 }}>{c.name}</td>
                    {/* Spend */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.mar.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.apr.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.may.spend)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(c.jun.spend)}</td>
                    {/* ROAS */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.roas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.roas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.roas)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtFloat(c.jun.roas)}</td>
                    {/* CPC */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.mar.cpc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.apr.cpc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(c.may.cpc)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(c.jun.cpc)}</td>
                    {/* CTR */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.mar.ctr)}%</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.apr.ctr)}%</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(c.may.ctr)}%</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtFloat(c.jun.ctr)}%</td>
                    {/* Impressions */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.mar.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.apr.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(c.may.impressions)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtVal(c.jun.impressions)}</td>
                    {/* Comparison */}
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Spend: {renderVs(c.vsLastMonth.spend)}</div>
                        <div>ROAS: {renderVs(c.vsLastMonth.roas)}</div>
                        <div>CPC: {renderVs(c.vsLastMonth.cpc)}</div>
                        <div>CTR: {renderVs(c.vsLastMonth.ctr)}</div>
                        <div>Impr: {renderVs(c.vsLastMonth.impressions)}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>Spend: {renderVs(c.vsAvg3M.spend)}</div>
                        <div>ROAS: {renderVs(c.vsAvg3M.roas)}</div>
                        <div>CPC: {renderVs(c.vsAvg3M.cpc)}</div>
                        <div>CTR: {renderVs(c.vsAvg3M.ctr)}</div>
                        <div>Impr: {renderVs(c.vsAvg3M.impressions)}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {data?.total && (
              <tfoot>
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #2d3348', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  {/* Spend */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.spend)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(data.total.jun.spend)}</td>
                  {/* ROAS */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.roas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.roas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.roas)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtFloat(data.total.jun.roas)}</td>
                  {/* CPC */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.cpc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.cpc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.cpc)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(data.total.jun.cpc)}</td>
                  {/* CTR */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.ctr)}%</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.ctr)}%</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.ctr)}%</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtFloat(data.total.jun.ctr)}%</td>
                  {/* Impressions */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.impressions)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtVal(data.total.jun.impressions)}</td>
                  {/* Comparison */}
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Spend: {renderVs(data.total.vsLastMonth.spend)}</div>
                      <div>ROAS: {renderVs(data.total.vsLastMonth.roas)}</div>
                      <div>CPC: {renderVs(data.total.vsLastMonth.cpc)}</div>
                      <div>CTR: {renderVs(data.total.vsLastMonth.ctr)}</div>
                      <div>Impr: {renderVs(data.total.vsLastMonth.impressions)}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Spend: {renderVs(data.total.vsAvg3M.spend)}</div>
                      <div>ROAS: {renderVs(data.total.vsAvg3M.roas)}</div>
                      <div>CPC: {renderVs(data.total.vsAvg3M.cpc)}</div>
                      <div>CTR: {renderVs(data.total.vsAvg3M.ctr)}</div>
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
