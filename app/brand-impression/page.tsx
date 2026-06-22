'use client';
import React, { useState, useEffect } from 'react';
import DaysCountBadge from '@/components/DaysCountBadge';

const fmtINR = (val: number) => '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal = (val: number) => Math.round(Number(val) || 0).toLocaleString('en-IN');
const fmtPctStr = (val: number) => {
  if (!isFinite(val)) return '0.00%';
  return (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

export default function BrandImpressionMoM() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [data, setData] = useState<any>(null);
  
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  // Date Range (default June 1 to yesterday)
  const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const today = new Date(istString);
  const yday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  
  const defStart = '2026-06-01'; // Default as requested
  const defEnd = `${yday.getFullYear()}-${String(yday.getMonth()+1).padStart(2,'0')}-${String(yday.getDate()).padStart(2,'0')}`;
  
  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate] = useState(defEnd);

  // Fetch campaigns on load
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoadingCamps(true);
      setError('');
      try {
        const res = await fetch('/api/brand-impression/campaigns');
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        
        setCampaigns(json.campaigns || []);
        if (json.campaigns && json.campaigns.length > 0) {
          setSelectedCampaignId(json.campaigns[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load campaigns');
      } finally {
        setLoadingCamps(false);
      }
    };
    fetchCampaigns();
  }, []);

  // Fetch keyword data when campaign or dates change
  useEffect(() => {
    if (!selectedCampaignId) return;

    const fetchKeywordData = async () => {
      setLoadingData(true);
      setError('');
      try {
        const qs = new URLSearchParams({ campaignId: selectedCampaignId, startDate, endDate });
        const res = await fetch(`/api/brand-impression/keywords?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch keyword data');
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch keyword data');
      } finally {
        setLoadingData(false);
      }
    };
    fetchKeywordData();
  }, [selectedCampaignId, startDate, endDate]);

  const exportCSV = () => {
    if (!data) return;
    
    const headers = [
      'Keyword',
      'Amount Spent Mar', 'Amount Spent Apr', 'Amount Spent May', 'Amount Spent Jun',
      'Impressions Mar', 'Impressions Apr', 'Impressions May', 'Impressions Jun',
      'Impression Share % Mar', 'Impression Share % Apr', 'Impression Share % May', 'Impression Share % Jun'
    ];

    const rows = data.keywords.map((k: any) => [
      k.keyword,
      k.mar.spend, k.apr.spend, k.may.spend, k.jun.spend,
      k.mar.impressions, k.apr.impressions, k.may.impressions, k.jun.impressions,
      k.mar.impressionShare, k.apr.impressionShare, k.may.impressionShare, k.jun.impressionShare
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Brand_Impression_MoM_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Brand Impression MoM (Google)</h1>
          <DaysCountBadge />
        </div>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '300px' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Branded Search Campaign</label>
          <select 
            value={selectedCampaignId} 
            onChange={e => setSelectedCampaignId(e.target.value)} 
            disabled={loadingCamps}
            style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #333' }}
          >
            {loadingCamps && <option value="">Loading campaigns...</option>}
            {!loadingCamps && campaigns.length === 0 && <option value="">No branded campaigns found</option>}
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {loadingData && !data ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading keyword data...</div>
      ) : data && data.keywords ? (
        <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Keyword</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Impressions</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', textAlign: 'center' }}>Impression Share %</th>
              </tr>
              <tr>
                {/* 3 Metric blocks x 4 months = 12 headers */}
                {Array.from({ length: 3 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: i === 2 ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.keywords.map((k: any, i: number) => {
                const bg = i % 2 === 0 ? '#1a1d27' : '#1f2333';
                return (
                  <tr key={k.keyword} style={{ background: bg, borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #333', background: bg, position: 'sticky', left: 0 }}>{k.keyword}</td>
                    
                    {/* Amount Spent */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.mar.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.apr.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.may.spend)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(k.jun.spend)}</td>

                    {/* Impressions */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(k.mar.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(k.apr.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(k.may.impressions)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(k.jun.impressions)}</td>

                    {/* Impression Share % */}
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.mar.impressionShare)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.apr.impressionShare)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.may.impressionShare)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.jun.impressionShare)}</td>
                  </tr>
                );
              })}
            </tbody>
            {data.total && (
              <tfoot>
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #333', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #333', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  
                  {/* Amount Spent */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.spend)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtINR(data.total.jun.spend)}</td>

                  {/* Impressions */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.impressions)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #333' }}>{fmtVal(data.total.jun.impressions)}</td>

                  {/* Impression Share % */}
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.mar.impressionShare)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.apr.impressionShare)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.may.impressionShare)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.jun.impressionShare)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : null}
    </div>
  );
}
