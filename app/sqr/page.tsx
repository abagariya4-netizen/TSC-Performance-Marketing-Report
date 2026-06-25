'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DaysCountBadge from '@/components/DaysCountBadge';
import DateRangePicker from '@/components/DateRangePicker';

const formatIndianNum = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '—';
  return '₹' + new Intl.NumberFormat('en-IN').format(Math.round(num));
};

const formatDecimal = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '—';
  return num.toFixed(2);
};

const formatINRDecimal = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '—';
  return '₹' + num.toFixed(2);
};

const formatPercent = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '—';
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
  
  // Calculate exact 4 dynamically computed months
  const today = useMemo(() => new Date(), []);
  const defaultDates = useMemo(() => {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const m1Start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return {
      start: formatDate(m1Start),
      end: formatDate(yesterday)
    };
  }, [today]);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  
  const [data, setData] = useState<{searchTerms: any[], total: any, monthLabels: string[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!selectedCampaignId || selectedCampaignId === 'All') {
        setKeywords([]);
        setSelectedKeyword('All Keywords');
        return;
      }
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

  // Auto-fetch data on filter changes
  useEffect(() => {
    if (!selectedCampaignId || !startDate || !endDate || campaigns.length === 0) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let campaignsToFetch = selectedCampaignId === 'All' 
          ? campaigns.filter(c => c.id !== 'All').map(c => c.id)
          : [selectedCampaignId];

        if (campaignsToFetch.length === 0) {
           setData({searchTerms: [], total: {}, monthLabels: []});
           setLoading(false);
           return;
        }

        const fetchPromises = campaignsToFetch.map(cid => {
          const url = `/api/sqr/data?campaignId=${cid}&startDate=${startDate}&endDate=${endDate}${selectedKeyword !== 'All Keywords' ? \`&keyword=\${encodeURIComponent(selectedKeyword)}\` : ''}`;
          return fetch(url).then(r => r.json());
        });

        const results = await Promise.all(fetchPromises);
        
        let aggregatedSearchTerms = new Map();
        let aggregatedTotal: any = {};
        let monthLabels: string[] = [];
        
        for (const json of results) {
          if (json.error) throw new Error(json.error);
          if (monthLabels.length === 0 && json.monthLabels) {
            monthLabels = json.monthLabels;
            monthLabels.forEach(m => {
               aggregatedTotal[m] = { spend: 0, clicks: 0, impressions: 0, convValue: 0 };
            });
          }
          
          json.searchTerms?.forEach((row: any) => {
             const term = row.term;
             if (!aggregatedSearchTerms.has(term)) {
               const newRow: any = { term };
               monthLabels.forEach(m => {
                 newRow[m] = { spend: 0, clicks: 0, impressions: 0, convValue: 0 };
               });
               aggregatedSearchTerms.set(term, newRow);
             }
             
             const existingRow = aggregatedSearchTerms.get(term);
             
             monthLabels.forEach(m => {
                const mData = row[m] || {};
                const spend = mData.spend || 0;
                const roas = mData.roas || 0;
                const cpc = mData.cpc || 0;
                const ctr = mData.ctr || 0;

                const convValue = spend * roas;
                const clicks = cpc > 0 ? spend / cpc : 0;
                const impressions = ctr > 0 ? (clicks / ctr) * 100 : 0;

                existingRow[m].spend += spend;
                existingRow[m].convValue += convValue;
                existingRow[m].clicks += clicks;
                existingRow[m].impressions += impressions;
             });
          });
          
          if (json.total) {
             monthLabels.forEach(m => {
                const tData = json.total[m] || {};
                const spend = tData.spend || 0;
                const roas = tData.roas || 0;
                const cpc = tData.cpc || 0;
                const ctr = tData.ctr || 0;

                const convValue = spend * roas;
                const clicks = cpc > 0 ? spend / cpc : 0;
                const impressions = ctr > 0 ? (clicks / ctr) * 100 : 0;

                aggregatedTotal[m].spend += spend;
                aggregatedTotal[m].convValue += convValue;
                aggregatedTotal[m].clicks += clicks;
                aggregatedTotal[m].impressions += impressions;
             });
          }
        }
        
        // Finalize rows
        const finalSearchTerms = Array.from(aggregatedSearchTerms.values()).map((row: any) => {
           const finalRow: any = { term: row.term };
           monthLabels.forEach(m => {
              const r = row[m];
              finalRow[m] = {
                 spend: r.spend,
                 roas: r.spend > 0 ? r.convValue / r.spend : 0,
                 cpc: r.clicks > 0 ? r.spend / r.clicks : 0,
                 ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0
              };
           });
           return finalRow;
        });
        
        // Finalize total
        const finalTotal: any = {};
        monthLabels.forEach(m => {
           const t = aggregatedTotal[m];
           finalTotal[m] = {
              spend: t.spend,
              roas: t.spend > 0 ? t.convValue / t.spend : 0,
              cpc: t.clicks > 0 ? t.spend / t.clicks : 0,
              ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0
           };
        });

        setData({ searchTerms: finalSearchTerms, total: finalTotal, monthLabels });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedCampaignId, startDate, endDate, selectedKeyword, campaigns]);

  const filteredKeywords = useMemo(() => {
    const allKw = [{ text: 'All Keywords', matchType: '' }, ...keywords];
    if (!keywordSearch) return allKw;
    return allKw.filter(k => k.text.toLowerCase().includes(keywordSearch.toLowerCase()));
  }, [keywords, keywordSearch]);

  const sortedSearchTerms = useMemo(() => {
    if (!data || !data.searchTerms || data.monthLabels.length === 0) return [];
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
    
    // Write headers
    data.monthLabels.forEach(m => csv += `AMOUNT SPENT ${m.toUpperCase()},`);
    data.monthLabels.forEach(m => csv += `CPC ${m.toUpperCase()},`);
    data.monthLabels.forEach(m => csv += `CTR ${m.toUpperCase()},`);
    data.monthLabels.forEach(m => csv += `ROAS ${m.toUpperCase()},`);
    csv += '\n';
    
    // Write rows
    sortedSearchTerms.forEach(row => {
      csv += `"${row.term.replace(/"/g, '""')}",`;
      data.monthLabels.forEach(m => {
        const mData = row[m] || {};
        csv += `${Math.round(mData.spend || 0)},`;
      });
      data.monthLabels.forEach(m => {
        const mData = row[m] || {};
        csv += `${(mData.cpc || 0).toFixed(2)},`;
      });
      data.monthLabels.forEach(m => {
        const mData = row[m] || {};
        csv += `${(mData.ctr || 0).toFixed(2)}%,`;
      });
      data.monthLabels.forEach(m => {
        const mData = row[m] || {};
        csv += `${(mData.roas || 0).toFixed(2)},`;
      });
      csv += '\n';
    });

    // Write Total
    csv += '"Total",';
    data.monthLabels.forEach(m => {
      const tData = data.total[m] || {};
      csv += `${Math.round(tData.spend || 0)},`;
    });
    data.monthLabels.forEach(m => {
      const tData = data.total[m] || {};
      csv += `${(tData.cpc || 0).toFixed(2)},`;
    });
    data.monthLabels.forEach(m => {
      const tData = data.total[m] || {};
      csv += `${(tData.ctr || 0).toFixed(2)}%,`;
    });
    data.monthLabels.forEach(m => {
      const tData = data.total[m] || {};
      csv += `${(tData.roas || 0).toFixed(2)},`;
    });
    csv += '\n';

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
            endD = new Date(endD.getFullYear(), endD.getMonth() + 1, 0);
            if (endD > yday) endD = yday;
            
            setStartDate(startD.toISOString().split('T')[0]);
            setEndDate(endD.toISOString().split('T')[0]);
          }}
          onReset={() => {
            setStartDate(defaultDates.start);
            setEndDate(defaultDates.end);
          }}
        />

        {loading && <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>⏳ Loading...</span>}
        {error && <span style={{ color: 'var(--danger-color)', marginLeft: '12px' }}>{error}</span>}
      </div>

      {data && !loading && (
        <div className="table-wrapper" style={{ overflowX: 'auto', position: 'relative', zIndex: 1, border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', maxWidth: '250px', width: '250px', position: 'sticky', left: 0, background: '#e8733a', zIndex: 15, padding: '12px 16px', color: '#fff' }}>SEARCH TERM</th>
                <th colSpan={data.monthLabels.length} style={{ textAlign: 'center', background: '#e8733a', borderRight: '1px solid var(--border-color)', padding: '8px', color: '#fff' }}>AMOUNT SPENT</th>
                <th colSpan={data.monthLabels.length} style={{ textAlign: 'center', background: '#e8733a', borderRight: '1px solid var(--border-color)', padding: '8px', color: '#fff' }}>CPC</th>
                <th colSpan={data.monthLabels.length} style={{ textAlign: 'center', background: '#e8733a', borderRight: '1px solid var(--border-color)', padding: '8px', color: '#fff' }}>CTR</th>
                <th colSpan={data.monthLabels.length} style={{ textAlign: 'center', background: '#e8733a', padding: '8px', color: '#fff' }}>ROAS</th>
              </tr>
              <tr>
                {data.monthLabels.map(m => <th key={`sp-${m}`} style={{ fontSize: '12px', textAlign: 'center', background: '#e8733a', padding: '8px', color: '#fff', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{m.toUpperCase()}</th>)}
                {data.monthLabels.map(m => <th key={`cpc-${m}`} style={{ fontSize: '12px', textAlign: 'center', background: '#e8733a', padding: '8px', color: '#fff', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{m.toUpperCase()}</th>)}
                {data.monthLabels.map(m => <th key={`ctr-${m}`} style={{ fontSize: '12px', textAlign: 'center', background: '#e8733a', padding: '8px', color: '#fff', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{m.toUpperCase()}</th>)}
                {data.monthLabels.map(m => <th key={`roas-${m}`} style={{ fontSize: '12px', textAlign: 'center', background: '#e8733a', padding: '8px', color: '#fff', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{m.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {sortedSearchTerms.map((row, i) => (
                <tr key={row.term} style={{ backgroundColor: i % 2 === 0 ? '#1a1d27' : '#1f2333', borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', maxWidth: '250px', width: '250px', wordBreak: 'break-word', position: 'sticky', left: 0, background: i % 2 === 0 ? '#1a1d27' : '#1f2333', zIndex: 2, padding: '12px 16px' }}>
                    {row.term}
                  </td>
                  {/* AMOUNT SPENT */}
                  {data.monthLabels.map(m => (
                    <td key={`sp-${m}`} style={{ textAlign: 'center', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      {formatIndianNum(row[m]?.spend)}
                    </td>
                  ))}
                  {/* CPC */}
                  {data.monthLabels.map(m => (
                    <td key={`cpc-${m}`} style={{ textAlign: 'center', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      {formatINRDecimal(row[m]?.cpc)}
                    </td>
                  ))}
                  {/* CTR */}
                  {data.monthLabels.map(m => (
                    <td key={`ctr-${m}`} style={{ textAlign: 'center', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      {formatPercent(row[m]?.ctr)}
                    </td>
                  ))}
                  {/* ROAS */}
                  {data.monthLabels.map(m => (
                    <td key={`roas-${m}`} style={{ textAlign: 'center', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      {formatDecimal(row[m]?.roas)}
                    </td>
                  ))}
                </tr>
              ))}
              {sortedSearchTerms.length === 0 && (
                <tr>
                  <td colSpan={1 + data.monthLabels.length * 4} style={{ textAlign: 'center', padding: '32px' }}>
                    No search query data found for this period.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Pinned Total Row */}
            {sortedSearchTerms.length > 0 && data.total && (
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ backgroundColor: 'var(--accent-primary)', color: 'white', fontWeight: 'bold' }}>
                  <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)', maxWidth: '250px', width: '250px', position: 'sticky', left: 0, background: 'var(--accent-primary)', zIndex: 15, padding: '12px 16px' }}>
                    Total
                  </td>
                  {/* AMOUNT SPENT */}
                  {data.monthLabels.map(m => (
                    <td key={`tsp-${m}`} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--accent-primary)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                      {formatIndianNum(data.total[m]?.spend)}
                    </td>
                  ))}
                  {/* CPC */}
                  {data.monthLabels.map(m => (
                    <td key={`tcpc-${m}`} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--accent-primary)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                      {formatINRDecimal(data.total[m]?.cpc)}
                    </td>
                  ))}
                  {/* CTR */}
                  {data.monthLabels.map(m => (
                    <td key={`tctr-${m}`} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--accent-primary)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                      {formatPercent(data.total[m]?.ctr)}
                    </td>
                  ))}
                  {/* ROAS */}
                  {data.monthLabels.map(m => (
                    <td key={`troas-${m}`} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--accent-primary)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                      {formatDecimal(data.total[m]?.roas)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
