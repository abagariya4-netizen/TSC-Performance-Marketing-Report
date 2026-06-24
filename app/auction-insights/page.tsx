'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DaysCountBadge from '@/components/DaysCountBadge';

const formatPercent = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '—';
  if (val < 0.1 && val > 0) return '< 10%';
  if (val === 0) return '—';
  return (val * 100).toFixed(2) + '%';
};

export default function AuctionInsightsPage() {
  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  
  const [keywords, setKeywords] = useState<{text: string, matchType: string}[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState('All Keywords');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  
  const [endDate, setEndDate] = useState('');
  
  const [data, setData] = useState<{domains: any[], monthLabels: string[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const yday = new Date(today);
    yday.setDate(yday.getDate() - 1);
    setEndDate(yday.toISOString().split('T')[0]);
    
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/auction-insights/campaigns');
      const json = await res.json();
      if (json.campaigns && json.campaigns.length > 0) {
        setCampaigns(json.campaigns);
        setSelectedCampaignId(json.campaigns[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      fetchKeywords(selectedCampaignId);
      setSelectedKeyword('All Keywords');
      if (endDate) {
        fetchData(selectedCampaignId, 'All Keywords', endDate);
      }
    }
  }, [selectedCampaignId]);

  const fetchKeywords = async (cid: string) => {
    try {
      const res = await fetch(`/api/auction-insights/keywords?campaignId=${cid}`);
      const json = await res.json();
      if (json.keywords) {
        setKeywords(json.keywords);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async (cid: string, kw: string, endD: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/auction-insights/data?campaignId=${cid}&endDate=${endD}${kw !== 'All Keywords' ? `&keyword=${encodeURIComponent(kw)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (selectedCampaignId && endDate) {
      fetchData(selectedCampaignId, selectedKeyword, endDate);
    }
  };

  const filteredKeywords = useMemo(() => {
    const allKw = [{ text: 'All Keywords', matchType: '' }, ...keywords];
    if (!keywordSearch) return allKw;
    return allKw.filter(k => k.text.toLowerCase().includes(keywordSearch.toLowerCase()));
  }, [keywords, keywordSearch]);

  const sortedDomains = useMemo(() => {
    if (!data || !data.domains) return [];
    const lastMonthLabel = data.monthLabels[data.monthLabels.length - 1]; // "jun"
    
    let youRow = null;
    const others = [];
    
    for (const row of data.domains) {
      if (row.domain === 'You') {
        youRow = row;
      } else {
        others.push(row);
      }
    }
    
    others.sort((a, b) => {
      const aVal = a[lastMonthLabel]?.impressionShare || 0;
      const bVal = b[lastMonthLabel]?.impressionShare || 0;
      return bVal - aVal;
    });
    
    return youRow ? [youRow, ...others] : others;
  }, [data]);

  const exportCSV = () => {
    if (!data || sortedDomains.length === 0) return;
    
    let csv = 'Domain,';
    // Header Row 1 (Months)
    data.monthLabels.forEach(m => {
      csv += `${m.toUpperCase()} Impr. Share,${m.toUpperCase()} Overlap,${m.toUpperCase()} Pos. Above,${m.toUpperCase()} Top of Page,${m.toUpperCase()} Abs Top,${m.toUpperCase()} Outranking,`;
    });
    csv += '\\n';
    
    sortedDomains.forEach(row => {
      csv += `"${row.domain}",`;
      data.monthLabels.forEach(m => {
        const mData = row[m] || {};
        csv += `${formatPercent(mData.impressionShare)},${formatPercent(mData.overlapRate)},${formatPercent(mData.positionAboveRate)},${formatPercent(mData.topOfPageRate)},${formatPercent(mData.absTopOfPageRate)},${formatPercent(mData.outrankingShare)},`;
      });
      csv += '\\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Google_Auction_Insights_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '0 24px 24px', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Auction Insights (Google)</h1>
          <DaysCountBadge />
        </div>
        <button onClick={exportCSV} className="btn-outline">
          📥 Export CSV
        </button>
      </div>

      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', zIndex: 10 }}>
        {/* Campaign Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Campaign:</label>
          <select 
            value={selectedCampaignId} 
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="input-field"
            style={{ minWidth: '240px', maxWidth: '300px' }}
          >
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Keyword Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Keyword:</label>
          <div style={{ position: 'relative' }}>
            <button 
              className="input-field" 
              style={{ minWidth: '200px', maxWidth: '300px', textAlign: 'left', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setIsKeywordDropdownOpen(!isKeywordDropdownOpen)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedKeyword}</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            {isKeywordDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', marginTop: '4px', zIndex: 50, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <input 
                    type="text" 
                    placeholder="Search keywords..." 
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '6px 8px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredKeywords.map(k => (
                  <div 
                    key={k.text} 
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}
                    onClick={() => {
                      setSelectedKeyword(k.text);
                      setIsKeywordDropdownOpen(false);
                      setKeywordSearch('');
                    }}
                  >
                    {k.text} {k.matchType && <span style={{ color: '#888', fontSize: '12px' }}>({k.matchType})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date Range End */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>End Date:</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field"
          />
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={loading || !selectedCampaignId}
          className="btn-primary"
          style={{ marginLeft: 'auto' }}
        >
          {loading ? '⏳ Loading...' : '🔄 Generate Report'}
        </button>

        {error && <span style={{ color: 'var(--danger-color)', marginLeft: '12px' }}>{error}</span>}
      </div>

      {data && !loading && (
        <div className="table-wrapper" style={{ overflowX: 'auto', position: 'relative', zIndex: 1 }}>
          <table className="modern-table" style={{ width: '100%', minWidth: '1600px' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', minWidth: '200px', position: 'sticky', left: 0, background: '#e8733a', zIndex: 5 }}>Competitor Domain</th>
                {data.monthLabels.map(m => (
                  <th key={m} colSpan={6} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                    {m.toUpperCase()}
                  </th>
                ))}
              </tr>
              <tr>
                {data.monthLabels.map(m => (
                  <React.Fragment key={`${m}-sub`}>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>Impr. Share</th>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>Overlap</th>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>Pos. Above</th>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>Top of Page</th>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>Abs Top</th>
                    <th style={{ fontSize: '12px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Outranking</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDomains.map((row, i) => (
                <tr key={row.domain} style={{ backgroundColor: i % 2 === 0 ? '#1a1d27' : '#1f2333' }}>
                  <td style={{ textAlign: 'left', fontWeight: row.domain === 'You' ? 'bold' : 'normal', borderRight: '1px solid var(--border-color)', position: 'sticky', left: 0, background: i % 2 === 0 ? '#1a1d27' : '#1f2333', zIndex: 2 }}>
                    {row.domain}
                  </td>
                  {data.monthLabels.map(m => {
                    const mData = row[m] || {};
                    return (
                      <React.Fragment key={`${row.domain}-${m}`}>
                        <td style={{ textAlign: 'center' }}>{formatPercent(mData.impressionShare)}</td>
                        <td style={{ textAlign: 'center' }}>{formatPercent(mData.overlapRate)}</td>
                        <td style={{ textAlign: 'center' }}>{formatPercent(mData.positionAboveRate)}</td>
                        <td style={{ textAlign: 'center' }}>{formatPercent(mData.topOfPageRate)}</td>
                        <td style={{ textAlign: 'center' }}>{formatPercent(mData.absTopOfPageRate)}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{formatPercent(mData.outrankingShare)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {sortedDomains.length === 0 && (
                <tr>
                  <td colSpan={1 + data.monthLabels.length * 6} style={{ textAlign: 'center', padding: '32px' }}>
                    No auction insights data found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
