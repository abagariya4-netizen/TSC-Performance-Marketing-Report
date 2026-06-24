'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DaysCountBadge from '@/components/DaysCountBadge';
import DateRangePicker from '@/components/DateRangePicker';
import { getDefaultMonths } from '@/lib/dateRangeUtils';

const formatIndianNum = (num: number | undefined | null) => {
  if (num === undefined || num === null) return '—';
  return '₹' + new Intl.NumberFormat('en-IN').format(Math.round(num));
};

const formatDecimal = (num: number | undefined | null) => {
  if (num === undefined || num === null) return '—';
  return num.toFixed(2);
};

const formatPercent = (num: number | undefined | null) => {
  if (num === undefined || num === null) return '—';
  return num.toFixed(2) + '%';
};

export default function SQRPage() {
  const categories = ['All', 'Mat - Branded', 'Mat - Non Branded', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  
  const [keywords, setKeywords] = useState<{text: string, matchType: string}[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState('All Keywords');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  
  const defMonths = getDefaultMonths();
  const [startDate, setStartDate] = useState(defMonths[0].startDate);
  const [endDate, setEndDate] = useState(defMonths[defMonths.length - 1].endDate);
  
  const [data, setData] = useState<{searchTerms: any[], total: any, monthLabels: string[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    // defaults set in state initialization
  }, []);

  // Fetch campaigns on category change
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`/api/sqr/campaigns?category=${encodeURIComponent(selectedCategory)}`);
        const json = await res.json();
        if (json.campaigns) {
          setCampaigns(json.campaigns);
          if (json.campaigns.length > 0) {
            setSelectedCampaignId(json.campaigns[0].id);
          } else {
            setSelectedCampaignId('');
            setKeywords([]);
            setSelectedKeyword('All Keywords');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCampaigns();
  }, [selectedCategory]);

  // Fetch keywords on campaign change
  useEffect(() => {
    const fetchKeywords = async () => {
      if (!selectedCampaignId) return;
      try {
        const res = await fetch(`/api/sqr/keywords?campaignId=${selectedCampaignId}`);
        const json = await res.json();
        if (json.keywords) {
          setKeywords(json.keywords);
          setSelectedKeyword('All Keywords');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchKeywords();
  }, [selectedCampaignId]);

  const handleGenerate = async () => {
    if (!selectedCampaignId || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/sqr/data?campaignId=${selectedCampaignId}&startDate=${startDate}&endDate=${endDate}${selectedKeyword !== 'All Keywords' ? `&keyword=${encodeURIComponent(selectedKeyword)}` : ''}`;
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

  const filteredKeywords = useMemo(() => {
    const allKw = [{ text: 'All Keywords', matchType: '' }, ...keywords];
    if (!keywordSearch) return allKw;
    return allKw.filter(k => k.text.toLowerCase().includes(keywordSearch.toLowerCase()));
  }, [keywords, keywordSearch]);

  const sortedSearchTerms = useMemo(() => {
    if (!data || !data.searchTerms) return [];
    const lastMonthLabel = data.monthLabels[data.monthLabels.length - 1];
    
    return [...data.searchTerms].sort((a, b) => {
      const aVal = a[lastMonthLabel]?.spend || 0;
      const bVal = b[lastMonthLabel]?.spend || 0;
      return bVal - aVal;
    });
  }, [data]);

  const exportCSV = () => {
    if (!data || sortedSearchTerms.length === 0) return;
    
    let csv = 'Search Term,';
    data.monthLabels.forEach(m => {
      csv += `${m.toUpperCase()} Spend,${m.toUpperCase()} ROAS,${m.toUpperCase()} CTR,${m.toUpperCase()} CPC,`;
    });
    csv += '\\n';
    
    sortedSearchTerms.forEach(row => {
      csv += `"${row.term}",`;
      data.monthLabels.forEach(m => {
        const mData = row[m] || {};
        csv += `${mData.spend || 0},${mData.roas || 0},${mData.ctr || 0},${mData.cpc || 0},`;
      });
      csv += '\\n';
    });

    // Total row
    csv += '"Total",';
    data.monthLabels.forEach(m => {
      const tData = data.total[m] || {};
      csv += `${tData.spend || 0},${tData.roas || 0},${tData.ctr || 0},${tData.cpc || 0},`;
    });
    csv += '\\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SQR_Google_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '0 24px 24px', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>SQR - Search Query Report (Google)</h1>
          <DaysCountBadge />
        </div>
        <button onClick={exportCSV} className="btn-outline">
          📥 Export CSV
        </button>
      </div>

      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', zIndex: 10 }}>
        {/* Category Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
            style={{ minWidth: '160px' }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

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
          <table className="modern-table" style={{ width: '100%', minWidth: '1200px' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', minWidth: '200px', position: 'sticky', left: 0, background: '#e8733a', zIndex: 5 }}>Search Term</th>
                {data.monthLabels.map(m => (
                  <th key={m} colSpan={4} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                    {m.toUpperCase()}
                  </th>
                ))}
              </tr>
              <tr>
                {data.monthLabels.map(m => (
                  <React.Fragment key={`${m}-sub`}>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>Amount Spent</th>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>ROAS</th>
                    <th style={{ fontSize: '12px', textAlign: 'center' }}>CTR</th>
                    <th style={{ fontSize: '12px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>CPC</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSearchTerms.map((row, i) => (
                <tr key={row.term} style={{ backgroundColor: i % 2 === 0 ? '#1a1d27' : '#1f2333' }}>
                  <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', position: 'sticky', left: 0, background: i % 2 === 0 ? '#1a1d27' : '#1f2333', zIndex: 2 }}>
                    {row.term}
                  </td>
                  {data.monthLabels.map(m => {
                    const mData = row[m] || {};
                    return (
                      <React.Fragment key={`${row.term}-${m}`}>
                        <td style={{ textAlign: 'center' }}>{formatIndianNum(mData.spend)}</td>
                        <td style={{ textAlign: 'center' }}>{formatDecimal(mData.roas)}</td>
                        <td style={{ textAlign: 'center' }}>{formatPercent(mData.ctr)}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{formatDecimal(mData.cpc)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {sortedSearchTerms.length === 0 && (
                <tr>
                  <td colSpan={1 + data.monthLabels.length * 4} style={{ textAlign: 'center', padding: '32px' }}>
                    No search query data found for this period.
                  </td>
                </tr>
              )}
              {/* Pinned Total Row */}
              {sortedSearchTerms.length > 0 && data.total && (
                <tr style={{ backgroundColor: 'var(--accent-primary)', color: 'white', fontWeight: 'bold' }}>
                  <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', position: 'sticky', left: 0, background: 'var(--accent-primary)', zIndex: 3 }}>
                    Total
                  </td>
                  {data.monthLabels.map(m => {
                    const tData = data.total[m] || {};
                    return (
                      <React.Fragment key={`total-${m}`}>
                        <td style={{ textAlign: 'center' }}>{formatIndianNum(tData.spend)}</td>
                        <td style={{ textAlign: 'center' }}>{formatDecimal(tData.roas)}</td>
                        <td style={{ textAlign: 'center' }}>{formatPercent(tData.ctr)}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{formatDecimal(tData.cpc)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
