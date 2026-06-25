'use client';
import React, { useState, useEffect } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import { getDefaultMonths } from '@/lib/dateRangeUtils';
import GoogleAdsGate from '@/components/GoogleAdsGate';

const fmtINR = (val: number) => '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSpend = (val: number) => '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');
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
  


  const defMonths = getDefaultMonths();
  const [startDate, setStartDate] = useState(defMonths[0].startDate);
  const [endDate, setEndDate] = useState(defMonths[defMonths.length - 1].endDate);

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
                });
              }
              const entry = mergedKeywords.get(k.keyword);
              const mLabels = res.monthLabels || [];
              mLabels.forEach((m: string) => {
                if (!entry[m]) entry[m] = { spend: 0, impressions: 0, eligibleImpressions: 0, impressionShare: 0, clicks: 0, cv: 0 };
              });
              mLabels.forEach((m: string) => {
                entry[m].spend += k[m].spend || 0;
                entry[m].impressions += k[m].impressions || 0;
                entry[m].clicks += k[m].clicks || 0;
                entry[m].cv += k[m].cv || 0;
                if (k[m].impressionShare > 0) {
                  entry[m].eligibleImpressions += (k[m].impressions / (k[m].impressionShare / 100));
                  entry[m].impressionsWithIS = (entry[m].impressionsWithIS || 0) + k[m].impressions;
                }
              });
            });
          });
          
          let mLabels = results[0]?.monthLabels || [];
          
          const finalKeywords = Array.from(mergedKeywords.values()).map((entry: any) => {
            mLabels.forEach((m: string) => {
              entry[m].impressionShare = entry[m].eligibleImpressions > 0 
                ? ((entry[m].impressionsWithIS || 0) / entry[m].eligibleImpressions) * 100 
                : 0;
            });
            return entry;
          });
          const lastM = mLabels[mLabels.length - 1];
          finalKeywords.sort((a: any, b: any) => (b[lastM]?.spend || 0) - (a[lastM]?.spend || 0));
          
          const totals: any = {};
          mLabels.forEach((m: string) => {
            totals[m] = { spend: 0, impressions: 0, eligibleImpressions: 0, impressionsWithIS: 0, impressionShare: 0, clicks: 0, cv: 0 };
          });
          finalKeywords.forEach(k => {
            mLabels.forEach((m: string) => {
              totals[m].spend += k[m].spend;
              totals[m].impressions += k[m].impressions;
              totals[m].eligibleImpressions += (k[m].eligibleImpressions || 0);
              totals[m].impressionsWithIS += (k[m].impressionsWithIS || 0);
              totals[m].clicks += k[m].clicks;
              totals[m].cv += k[m].cv;
            });
          });
          mLabels.forEach((m: string) => {
            totals[m].impressionShare = totals[m].eligibleImpressions > 0 
              ? (totals[m].impressionsWithIS / totals[m].eligibleImpressions) * 100 
              : 0;
            totals[m].cpc = totals[m].clicks > 0 ? totals[m].spend / totals[m].clicks : 0;
            totals[m].ctr = totals[m].impressions > 0 ? (totals[m].clicks / totals[m].impressions) * 100 : 0;
            totals[m].roas = totals[m].spend > 0 ? totals[m].cv / totals[m].spend : 0;
            totals[m].spendSalience = 100;
          });
          finalKeywords.forEach((entry: any) => {
            mLabels.forEach((m: string) => {
              entry[m].cpc = entry[m].clicks > 0 ? entry[m].spend / entry[m].clicks : 0;
              entry[m].ctr = entry[m].impressions > 0 ? (entry[m].clicks / entry[m].impressions) * 100 : 0;
              entry[m].roas = entry[m].spend > 0 ? entry[m].cv / entry[m].spend : 0;
              entry[m].spendSalience = totals[m].spend > 0 ? (entry[m].spend / totals[m].spend) * 100 : 0;
            });
          });
          setData({ keywords: finalKeywords, total: totals, monthLabels: mLabels });
        } else {
          const qs = new URLSearchParams({ campaignId: selectedCampaignId, startDate, endDate });
          const res = await fetch(`/api/brand-impression/keywords?${qs.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch keyword data');
          const json = await res.json();
          if (json.error) throw new Error(json.error);
          if (json.keywords && json.monthLabels) {
            const lastM = json.monthLabels[json.monthLabels.length - 1];
            json.keywords.sort((a: any, b: any) => (b[lastM]?.spend || 0) - (a[lastM]?.spend || 0));
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
    
    const mLabels = data.monthLabels || [];
    
    let headerM = '';
    mLabels.forEach((m: string) => headerM += `Amount Spent ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Spend Salience % ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `CPC ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `CTR ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `ROAS ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Impressions ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Impression Share % ${m.toUpperCase()},`);

    // Remove trailing comma
    headerM = headerM.replace(/,$/, '');

    const headers = [
      'Keyword',
      headerM
    ];

    const rows = data.keywords.map((k: any) => {
      let row = `"${k.keyword}",`;
      mLabels.forEach((m: string) => row += `${k[m].spend},`);
      mLabels.forEach((m: string) => row += `${k[m].spendSalience},`);
      mLabels.forEach((m: string) => row += `${k[m].cpc},`);
      mLabels.forEach((m: string) => row += `${k[m].ctr},`);
      mLabels.forEach((m: string) => row += `${k[m].roas},`);
      mLabels.forEach((m: string) => row += `${k[m].impressions},`);
      mLabels.forEach((m: string) => row += `${k[m].impressionShare},`);
      return row.replace(/,$/, '');
    });

    const csvContent = [
      headers.join(','),
      ...rows
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
    <GoogleAdsGate>
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
        
        <DateRangePicker 
          onApply={(start, end) => {
            const yday = new Date();
            yday.setDate(yday.getDate() - 1);
            
            const startD = new Date(start);
            let endD = new Date(end);
            endD = new Date(endD.getFullYear(), endD.getMonth() + 1, 0); // End of month
            
            if (endD > yday) {
              endD = yday;
            }
            
            setStartDate(startD.toISOString().split('T')[0]);
            setEndDate(endD.toISOString().split('T')[0]);
          }}
          onReset={() => {
            const def = getDefaultMonths();
            setStartDate(def[0].startDate);
            setEndDate(def[def.length - 1].endDate);
          }}
        />
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
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Spend Salience %</th>
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPC</th>
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CTR</th>
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>ROAS</th>
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Impressions</th>
                <th colSpan={data.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', textAlign: 'center' }}>Impression Share %</th>
              </tr>
              <tr>
                {/* 7 Metric blocks */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <React.Fragment key={i}>
                    {data.monthLabels?.map((m: string, j: number) => (
                      <th key={`${i}-${m}`} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: i === 6 && j === data.monthLabels.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>{m}</th>
                    ))}
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
                    {data.monthLabels?.map((m: string) => <td key={`sp-${m}`} style={{ padding: '12px 8px' }}>{fmtSpend(k[m]?.spend)}</td>)}
                    {/* Spend Salience % */}
                    {data.monthLabels?.map((m: string) => <td key={`sal-${m}`} style={{ padding: '12px 8px' }}>{fmtPctStr(k[m]?.spendSalience)}</td>)}
                    {/* CPC */}
                    {data.monthLabels?.map((m: string) => <td key={`cpc-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(k[m]?.cpc)}</td>)}
                    {/* CTR */}
                    {data.monthLabels?.map((m: string) => <td key={`ctr-${m}`} style={{ padding: '12px 8px' }}>{fmtPctStr(k[m]?.ctr)}</td>)}
                    {/* ROAS */}
                    {data.monthLabels?.map((m: string) => <td key={`roas-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(k[m]?.roas)}</td>)}
                    {/* Impressions */}
                    {data.monthLabels?.map((m: string) => <td key={`imp-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(k[m]?.impressions)}</td>)}
                    {/* Impression Share % */}
                    {data.monthLabels?.map((m: string) => <td key={`ish-${m}`} style={{ padding: '12px 8px' }}>{fmtPctStr(k[m]?.impressionShare)}</td>)}
                  </tr>
                );
              })}
            </tbody>
            {data.total && (
              <tfoot>
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #2d3348', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  
                  {/* Amount Spent */}
                  {data.monthLabels?.map((m: string) => <td key={`tsp-${m}`} style={{ padding: '12px 8px' }}>{fmtSpend(data.total[m]?.spend)}</td>)}
                  {/* Spend Salience % */}
                  {data.monthLabels?.map((m: string) => <td key={`tsal-${m}`} style={{ padding: '12px 8px' }}>{fmtPctStr(data.total[m]?.spendSalience)}</td>)}
                  {/* CPC */}
                  {data.monthLabels?.map((m: string) => <td key={`tcpc-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(data.total[m]?.cpc)}</td>)}
                  {/* CTR */}
                  {data.monthLabels?.map((m: string) => <td key={`tctr-${m}`} style={{ padding: '12px 8px' }}>{fmtPctStr(data.total[m]?.ctr)}</td>)}
                  {/* ROAS */}
                  {data.monthLabels?.map((m: string) => <td key={`troas-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(data.total[m]?.roas)}</td>)}
                  {/* Impressions */}
                  {data.monthLabels?.map((m: string) => <td key={`timp-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(data.total[m]?.impressions)}</td>)}
                  {/* Impression Share % */}
                  {data.monthLabels?.map((m: string) => <td key={`tish-${m}`} style={{ padding: '12px 8px' }}>{fmtPctStr(data.total[m]?.impressionShare)}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : null}
      </div>
    </GoogleAdsGate>
  );
}
