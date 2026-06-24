'use client';
import React, { useState, useEffect } from 'react';

const fmtINR = (val: number) => '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal = (val: number) => Math.round(Number(val) || 0).toLocaleString('en-IN');
const fmtPctStr = (val: number) => {
  if (!isFinite(val)) return '0.00%';
  return (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};
const fmtFloat = (val: number) => (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BrandImpressionMoM() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('All');
  const [data, setData] = useState<any>(null);
  
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  
  const [badgeInfo, setBadgeInfo] = useState<{ monthName: string, daysPassed: number, daysTotal: number, daysRemaining: number } | null>(null);

  useEffect(() => {
    const istString2 = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today2 = new Date(istString2);
    const yesterday2 = new Date(today2.getFullYear(), today2.getMonth(), today2.getDate() - 1);
    const mName = yesterday2.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dPassed = yesterday2.getDate();
    const dTotal = new Date(yesterday2.getFullYear(), yesterday2.getMonth() + 1, 0).getDate();
    setBadgeInfo({ monthName: mName, daysPassed: dPassed, daysTotal: dTotal, daysRemaining: dTotal - dPassed });
  }, []);
  


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
        // default is already 'All'
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
    if (selectedCampaignId === 'All' && campaigns.length === 0) return;

    const fetchKeywordData = async () => {
      setLoadingData(true);
      setError('');
      try {
        if (selectedCampaignId === 'All') {
          const fetchPromises = campaigns.map(c => {
            const qs = new URLSearchParams({ campaignId: c.id, startDate, endDate });
            return fetch(`/api/brand-impression/keywords?${qs.toString()}`).then(r => r.ok ? r.json() : null);
          });
          const results = await Promise.all(fetchPromises);
          
          const mergedKeywords = new Map<string, any>();
          
          results.forEach(res => {
            if (!res || res.error || !res.keywords) return;
            res.keywords.forEach((k: any) => {
              if (!mergedKeywords.has(k.keyword)) {
                mergedKeywords.set(k.keyword, {
                  keyword: k.keyword,
                  mar: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 },
                  apr: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 },
                  may: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 },
                  jun: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 }
                });
              }
              const entry = mergedKeywords.get(k.keyword);
              ['mar', 'apr', 'may', 'jun'].forEach(m => {
                entry[m].spend += k[m].spend || 0;
                entry[m].impressions += k[m].impressions || 0;
                entry[m].clicks += k[m].clicks || 0;
                entry[m].cv += k[m].cv || 0;
                if (k[m].impressionShare > 0) {
                  entry[m].eligibleImpressions += (k[m].impressions / (k[m].impressionShare / 100));
                }
              });
            });
          });
          
          const finalKeywords = Array.from(mergedKeywords.values()).map((entry: any) => {
            ['mar', 'apr', 'may', 'jun'].forEach(m => {
              entry[m].impressionShare = entry[m].eligibleImpressions > 0 
                ? (entry[m].impressions / entry[m].eligibleImpressions) * 100 
                : 0;
            });
            return entry;
          });
          finalKeywords.sort((a: any, b: any) => (b.jun?.spend || 0) - (a.jun?.spend || 0));
          
          const totals: any = {
            mar: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 },
            apr: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 },
            may: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 },
            jun: { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 }
          };
          finalKeywords.forEach(k => {
            ['mar', 'apr', 'may', 'jun'].forEach(m => {
              totals[m].spend += k[m].spend;
              totals[m].impressions += k[m].impressions;
              totals[m].eligibleImpressions += k[m].eligibleImpressions;
              totals[m].clicks += k[m].clicks;
              totals[m].cv += k[m].cv;
            });
          });
          ['mar', 'apr', 'may', 'jun'].forEach(m => {
            totals[m].impressionShare = totals[m].eligibleImpressions > 0 
              ? (totals[m].impressions / totals[m].eligibleImpressions) * 100 
              : 0;
            totals[m].cpc = totals[m].clicks > 0 ? totals[m].spend / totals[m].clicks : 0;
            totals[m].ctr = totals[m].impressions > 0 ? (totals[m].clicks / totals[m].impressions) * 100 : 0;
            totals[m].roas = totals[m].spend > 0 ? totals[m].cv / totals[m].spend : 0;
            totals[m].spendSalience = 100;
          });
          finalKeywords.forEach((entry: any) => {
            ['mar', 'apr', 'may', 'jun'].forEach(m => {
              entry[m].cpc = entry[m].clicks > 0 ? entry[m].spend / entry[m].clicks : 0;
              entry[m].ctr = entry[m].impressions > 0 ? (entry[m].clicks / entry[m].impressions) * 100 : 0;
              entry[m].roas = entry[m].spend > 0 ? entry[m].cv / entry[m].spend : 0;
              entry[m].spendSalience = totals[m].spend > 0 ? (entry[m].spend / totals[m].spend) * 100 : 0;
            });
          });
          setData({ keywords: finalKeywords, total: totals });
        } else {
          const qs = new URLSearchParams({ campaignId: selectedCampaignId, startDate, endDate });
          const res = await fetch(`/api/brand-impression/keywords?${qs.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch keyword data');
          const json = await res.json();
          if (json.error) throw new Error(json.error);
          if (json.keywords) {
            json.keywords.sort((a: any, b: any) => (b.jun?.spend || 0) - (a.jun?.spend || 0));
          }
          setData(json);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch keyword data');
      } finally {
        setLoadingData(false);
      }
    };
    fetchKeywordData();
  }, [selectedCampaignId, startDate, endDate, campaigns]);

  const exportCSV = () => {
    if (!data) return;
    
    const headers = [
      'Keyword',
      'Amount Spent Mar', 'Amount Spent Apr', 'Amount Spent May', 'Amount Spent Jun',
      'Spend Salience % Mar', 'Spend Salience % Apr', 'Spend Salience % May', 'Spend Salience % Jun',
      'CPC Mar', 'CPC Apr', 'CPC May', 'CPC Jun',
      'CTR Mar', 'CTR Apr', 'CTR May', 'CTR Jun',
      'ROAS Mar', 'ROAS Apr', 'ROAS May', 'ROAS Jun',
      'Impressions Mar', 'Impressions Apr', 'Impressions May', 'Impressions Jun',
      'Impression Share % Mar', 'Impression Share % Apr', 'Impression Share % May', 'Impression Share % Jun'
    ];

    const rows = data.keywords.map((k: any) => [
      k.keyword,
      k.mar.spend, k.apr.spend, k.may.spend, k.jun.spend,
      k.mar.spendSalience, k.apr.spendSalience, k.may.spendSalience, k.jun.spendSalience,
      k.mar.cpc, k.apr.cpc, k.may.cpc, k.jun.cpc,
      k.mar.ctr, k.apr.ctr, k.may.ctr, k.jun.ctr,
      k.mar.roas, k.apr.roas, k.may.roas, k.jun.roas,
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
          {badgeInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
              <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
                📅 {badgeInfo.monthName} | Day {badgeInfo.daysPassed} of {badgeInfo.daysTotal} | {badgeInfo.daysRemaining} days remaining
              </span>
            </div>
          )}
        </div>
        <button 
          onClick={exportCSV}
          style={{ backgroundColor: '#2d3748', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          📥 Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '300px' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Branded Search Campaign</label>
          <select 
            value={selectedCampaignId} 
            onChange={e => setSelectedCampaignId(e.target.value)} 
            disabled={loadingCamps}
            style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #2d3348' }}
          >
            {loadingCamps && <option value="">Loading campaigns...</option>}
            {!loadingCamps && campaigns.length === 0 && <option value="">No branded campaigns found</option>}
            {!loadingCamps && campaigns.length > 0 && <option value="All">All</option>}
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {loadingData && !data ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading keyword data...</div>
      ) : data && data.keywords ? (
        <div style={{ overflowX: 'auto', border: '1px solid #2d3348', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <thead style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
              <tr>
                <th rowSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Keyword</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Spend Salience %</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPC</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CTR</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>ROAS</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Impressions</th>
                <th colSpan={4} style={{ background: '#e8733a', color: '#fff', padding: '8px', textAlign: 'center' }}>Impression Share %</th>
              </tr>
              <tr>
                {/* 7 Metric blocks x 4 months = 28 headers */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Mar</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Apr</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>May</th>
                    <th style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: i === 6 ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>Jun</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.keywords.map((k: any, i: number) => {
                const bg = i % 2 === 0 ? '#1a1d27' : '#1f2333';
                return (
                  <tr key={k.keyword} style={{ background: bg, borderBottom: '1px solid #2d3348' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', background: bg, position: 'sticky', left: 0 }}>{k.keyword}</td>
                    
                    {/* Amount Spent */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.mar.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.apr.spend)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.may.spend)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(k.jun.spend)}</td>

                    {/* Spend Salience % */}
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.mar.spendSalience)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.apr.spendSalience)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.may.spendSalience)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtPctStr(k.jun.spendSalience)}</td>

                    {/* CPC */}
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.mar.cpc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.apr.cpc)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtINR(k.may.cpc)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(k.jun.cpc)}</td>

                    {/* CTR */}
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.mar.ctr)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.apr.ctr)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtPctStr(k.may.ctr)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtPctStr(k.jun.ctr)}</td>

                    {/* ROAS */}
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(k.mar.roas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(k.apr.roas)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtFloat(k.may.roas)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtFloat(k.jun.roas)}</td>

                    {/* Impressions */}
                    <td style={{ padding: '12px 8px' }}>{fmtVal(k.mar.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(k.apr.impressions)}</td>
                    <td style={{ padding: '12px 8px' }}>{fmtVal(k.may.impressions)}</td>
                    <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtVal(k.jun.impressions)}</td>

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
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #2d3348', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  
                  {/* Amount Spent */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.spend)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.spend)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(data.total.jun.spend)}</td>

                  {/* Spend Salience % */}
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.mar.spendSalience)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.apr.spendSalience)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.may.spendSalience)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtPctStr(data.total.jun.spendSalience)}</td>

                  {/* CPC */}
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.mar.cpc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.apr.cpc)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtINR(data.total.may.cpc)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtINR(data.total.jun.cpc)}</td>

                  {/* CTR */}
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.mar.ctr)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.apr.ctr)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtPctStr(data.total.may.ctr)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtPctStr(data.total.jun.ctr)}</td>

                  {/* ROAS */}
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.mar.roas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.apr.roas)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtFloat(data.total.may.roas)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtFloat(data.total.jun.roas)}</td>

                  {/* Impressions */}
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.mar.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.apr.impressions)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmtVal(data.total.may.impressions)}</td>
                  <td style={{ padding: '12px 8px', borderRight: '1px solid #2d3348' }}>{fmtVal(data.total.jun.impressions)}</td>

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
