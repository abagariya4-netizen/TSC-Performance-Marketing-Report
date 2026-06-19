'use client';
import React, { useMemo } from 'react';
import { pctChange } from '@/lib/metricUtils';

interface PlacementsTableProps {
  data: Record<string, Record<string, any>>;
  periods: string[];
  category: string;
  hasCategoryAction: boolean;
  csvRoasData?: Record<string, Record<string, number>> | null;
}

export default function PlacementsTable({ data, periods, category, hasCategoryAction, csvRoasData }: PlacementsTableProps) {
  const formatMonthHeader = (ymd: string) => {
    const d = new Date(ymd);
    return d.toLocaleString('en-IN', { month: 'short' });
  };

  const showCategoryRoas = (hasCategoryAction && category !== 'All') || !!csvRoasData;

  const formatINR = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;
  const formatPct = (val: number | null) => val != null ? `${val.toFixed(2)}%` : '—';
  const formatComp = (pct: number | null) => {
    if (pct == null) return <span style={{ color: '#666' }}>—</span>;
    const color = pct > 0 ? '#48bb78' : pct < 0 ? '#fc8181' : 'inherit';
    const sign = pct > 0 ? '+' : '';
    return <span style={{ color }}>{sign}{pct}%</span>;
  };

  const { totalsByMonth } = useMemo(() => {
    const tbm: Record<string, any> = {};
    const gt = { spend: 0, category_purchase: 0, overall_purchase: 0, link_clicks: 0, landing_page_views: 0, impressions: 0, clicks: 0 };
    
    periods.forEach(p => {
      tbm[p] = { spend: 0, category_purchase: 0, overall_purchase: 0, link_clicks: 0, landing_page_views: 0, impressions: 0, clicks: 0 };
    });

    Object.values(data).forEach(rowMap => {
      periods.forEach(p => {
        const m = rowMap[p];
        if (m) {
          tbm[p].spend += m.spend;
          tbm[p].category_purchase += m.category_purchase;
          tbm[p].overall_purchase += m.overall_purchase;
          tbm[p].link_clicks += m.link_clicks;
          tbm[p].landing_page_views += m.landing_page_views;
          tbm[p].impressions += m.impressions;
          tbm[p].clicks += m.clicks;
        }
      });
    });

    return { totalsByMonth: tbm };
  }, [data, periods]);

  const sortedPlacements = useMemo(() => {
    return Object.keys(data).sort((a, b) => {
      const spendA = periods.reduce((sum, p) => sum + (data[a][p]?.spend || 0), 0);
      const spendB = periods.reduce((sum, p) => sum + (data[b][p]?.spend || 0), 0);
      return spendB - spendA;
    });
  }, [data, periods]);

  const exportCSV = () => {
    const row1 = ['Placement'];
    const row2 = [''];

    // Headers
    const addGroup = (label: string) => {
      row1.push(label);
      for (let i = 1; i < periods.length; i++) row1.push('');
      periods.forEach(p => row2.push(formatMonthHeader(p)));
    };

    addGroup('Amount Spent');
    
    addGroup('Amount Spent Salience (%)');

    if (showCategoryRoas) {
      addGroup(`${category === 'All' ? 'Category' : category} ROAS`);
    }

    addGroup('Overall Purchase ROAS');
    addGroup('Overall Purchase Conv. Value');
    addGroup('Overall Conv. Value Salience (%)');
    addGroup('CTR (%)');
    addGroup('CPC');
    addGroup('CPM');
    addGroup('Link Clicks');
    addGroup('LC to LP (%)');
    addGroup('Landing Page Views');
    addGroup('Impressions');
    row1.push('Comparisons', '');
    row2.push('vs Last Month', 'vs Avg 3M');

    let csv = `"${row1.join('","')}"\n"${row2.join('","')}"\n`;

    const getRowData = (name: string, rowMap: Record<string, any>) => {
      const line = [`"${name}"`];
      
      // Amount Spent
      periods.forEach(p => line.push(rowMap[p]?.spend || 0));

      const currentPeriod = periods[periods.length - 1];
      const prevPeriod = periods.length > 1 ? periods[periods.length - 2] : null;
      const currentSpend = rowMap[currentPeriod]?.spend || 0;
      const prevSpend = prevPeriod ? (rowMap[prevPeriod]?.spend || 0) : 0;
      
      const last3Months = periods.slice(Math.max(0, periods.length - 4), periods.length - 1);
      const avg3 = last3Months.length > 0 
        ? last3Months.reduce((s, p) => s + (rowMap[p]?.spend || 0), 0) / last3Months.length 
        : 0;

      const vsLast = pctChange(currentSpend, prevSpend);
      const vsAvg = pctChange(currentSpend, avg3);

      // Salience Spend
      periods.forEach(p => {
        const total = totalsByMonth[p].spend;
        const val = rowMap[p]?.spend || 0;
        line.push(total > 0 ? `${((val / total) * 100).toFixed(2)}%` : '0%');
      });

      // Category ROAS
      if (showCategoryRoas) {
        periods.forEach(p => {
          if (csvRoasData) {
            const csvVal = csvRoasData[name]?.[p];
            line.push(csvVal != null ? csvVal.toString() : '');
          } else {
            const spend = rowMap[p]?.spend || 0;
            const conv = rowMap[p]?.category_purchase || 0;
            line.push(spend > 0 ? (conv / spend).toFixed(2) : '');
          }
        });
      }

      // Overall ROAS
      periods.forEach(p => {
        const spend = rowMap[p]?.spend || 0;
        const conv = rowMap[p]?.overall_purchase || 0;
        line.push(spend > 0 ? (conv / spend).toFixed(2) : '');
      });
      periods.forEach(p => line.push(rowMap[p]?.overall_purchase || 0));
      periods.forEach(p => {
        const total = totalsByMonth[p].overall_purchase;
        const val = rowMap[p]?.overall_purchase || 0;
        line.push(total > 0 ? `${((val / total) * 100).toFixed(2)}%` : '0%');
      });

      // CTR
      periods.forEach(p => {
        const imp = rowMap[p]?.impressions || 0;
        const clicks = rowMap[p]?.clicks || 0;
        line.push(imp > 0 ? `${((clicks / imp) * 100).toFixed(2)}%` : '');
      });

      // CPC
      periods.forEach(p => {
        const spend = rowMap[p]?.spend || 0;
        const clicks = rowMap[p]?.clicks || 0;
        line.push(clicks > 0 ? (spend / clicks).toFixed(2) : '');
      });

      // CPM
      periods.forEach(p => {
        const spend = rowMap[p]?.spend || 0;
        const imp = rowMap[p]?.impressions || 0;
        line.push(imp > 0 ? ((spend / imp) * 1000).toFixed(2) : '');
      });

      // Link Clicks
      periods.forEach(p => line.push(rowMap[p]?.link_clicks || 0));

      // LC to LP
      periods.forEach(p => {
        const lc = rowMap[p]?.link_clicks || 0;
        const lp = rowMap[p]?.landing_page_views || 0;
        line.push(lc > 0 ? `${((lp / lc) * 100).toFixed(2)}%` : '');
      });

      // LPVs & Impressions
      periods.forEach(p => line.push(rowMap[p]?.landing_page_views || 0));
      periods.forEach(p => line.push(rowMap[p]?.impressions || 0));

      // Comparisons
      line.push(vsLast != null ? `${vsLast}%` : '');
      line.push(vsAvg != null ? `${vsAvg}%` : '');

      return line.join(',');
    };

    sortedPlacements.forEach(placement => {
      csv += getRowData(placement, data[placement]) + '\n';
    });

    // Add TOTAL row
    csv += getRowData('TOTAL', totalsByMonth) + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSC_Placements_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const currentPeriod = periods[periods.length - 1];
  const prevPeriod = periods.length > 1 ? periods[periods.length - 2] : null;
  const last3Months = periods.slice(Math.max(0, periods.length - 4), periods.length - 1);

  if (periods.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', background: '#1a1d27', borderRadius: '8px' }}>No data available</div>;
  }

  const thStyle = { padding: '6px', borderBottom: '1px solid #c05621', textAlign: 'center' as any };
  const thSubStyle = { padding: '10px 12px', textAlign: 'center' as any };
  const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'right' as any };

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>📊 Placements Breakdowns</h2>
        <button onClick={exportCSV} style={{ background: 'transparent', border: '1px solid #4a5568', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>
      
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2d3748' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
              <th rowSpan={2} style={{ padding: '10px 12px', textAlign: 'left', verticalAlign: 'bottom' }}>Placement</th>
              <th colSpan={periods.length} style={thStyle}>Amount Spent</th>
              <th colSpan={periods.length} style={thStyle}>Amount Spent Salience (%)</th>
              
              {showCategoryRoas && (
                <>
                  <th colSpan={periods.length} style={thStyle}>{category === 'All' ? 'Category' : category} ROAS</th>
                </>
              )}

              <th colSpan={periods.length} style={thStyle}>Overall Purchase ROAS</th>
              <th colSpan={periods.length} style={thStyle}>Overall Purchase Conv. Value</th>
              <th colSpan={periods.length} style={thStyle}>Overall Conv. Value Salience (%)</th>
              <th colSpan={periods.length} style={thStyle}>CTR (%)</th>
              <th colSpan={periods.length} style={thStyle}>CPC</th>
              <th colSpan={periods.length} style={thStyle}>CPM</th>
              <th colSpan={periods.length} style={thStyle}>Link Clicks</th>
              <th colSpan={periods.length} style={thStyle}>LC to LP (%)</th>
              <th colSpan={periods.length} style={thStyle}>Landing Page Views</th>
              <th colSpan={periods.length} style={thStyle}>Impressions</th>
              <th colSpan={2} style={thStyle}>Comparisons</th>
            </tr>
            <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
              {/* Amount Spent */}
              {periods.map(p => <th key={`sp-${p}`} style={thSubStyle}>{formatMonthHeader(p)}</th>)}
              
              {/* Other columns */}
              {[...Array((showCategoryRoas ? 12 : 11))].map((_, i) => (
                periods.map(p => <th key={`sub-${i}-${p}`} style={thSubStyle}>{formatMonthHeader(p)}</th>)
              ))}
              
              <th style={thSubStyle}>vs Last Month</th>
              <th style={thSubStyle}>vs Avg 3M</th>
            </tr>
          </thead>
          <tbody>
            {[...sortedPlacements, 'TOTAL'].map((placement, i) => {
              const isTotal = placement === 'TOTAL';
              const rowMap = isTotal ? totalsByMonth : data[placement];
              const bg = isTotal ? '#0d2137' : (i % 2 === 0 ? '#1a1d27' : '#1f2333');
              const weight = isTotal ? 'bold' : 'normal';

              const currentSpend = rowMap[currentPeriod]?.spend || 0;
              const prevSpend = prevPeriod ? (rowMap[prevPeriod]?.spend || 0) : 0;
              const avg3 = last3Months.length > 0 
                ? last3Months.reduce((s, p) => s + (rowMap[p]?.spend || 0), 0) / last3Months.length 
                : 0;

              return (
                <tr key={placement} style={{ background: bg, fontWeight: weight }}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left' }}>
                    {placement}
                  </td>
                  
                  {/* Amount Spent */}
                  {periods.map(p => <td key={p} style={tdStyle}>{formatINR(rowMap[p]?.spend || 0)}</td>)}

                  {/* Salience Spend */}
                  {periods.map(p => {
                    const total = totalsByMonth[p].spend;
                    const val = rowMap[p]?.spend || 0;
                    return <td key={p} style={tdStyle}>{total > 0 ? formatPct((val / total) * 100) : '—'}</td>;
                  })}

                  {/* Category ROAS */}
                  {showCategoryRoas && (
                    <>
                      {periods.map(p => {
                        if (csvRoasData) {
                          const csvVal = csvRoasData[placement]?.[p];
                          return <td key={p} style={tdStyle}>{csvVal != null ? csvVal : '—'}</td>;
                        } else {
                          const spend = rowMap[p]?.spend || 0;
                          const conv = rowMap[p]?.category_purchase || 0;
                          return <td key={p} style={tdStyle}>{spend > 0 ? (conv / spend).toFixed(2) : '—'}</td>;
                        }
                      })}
                    </>
                  )}

                  {/* Overall ROAS */}
                  {periods.map(p => {
                    const spend = rowMap[p]?.spend || 0;
                    const conv = rowMap[p]?.overall_purchase || 0;
                    return <td key={p} style={tdStyle}>{spend > 0 ? (conv / spend).toFixed(2) : '—'}</td>;
                  })}
                  
                  {/* Overall Conv Value */}
                  {periods.map(p => <td key={p} style={tdStyle}>{formatINR(rowMap[p]?.overall_purchase || 0)}</td>)}
                  
                  {/* Overall Salience */}
                  {periods.map(p => {
                    const total = totalsByMonth[p].overall_purchase;
                    const val = rowMap[p]?.overall_purchase || 0;
                    return <td key={p} style={tdStyle}>{total > 0 ? formatPct((val / total) * 100) : '—'}</td>;
                  })}

                  {/* CTR */}
                  {periods.map(p => {
                    const imp = rowMap[p]?.impressions || 0;
                    const clicks = rowMap[p]?.clicks || 0;
                    return <td key={p} style={tdStyle}>{imp > 0 ? formatPct((clicks / imp) * 100) : '—'}</td>;
                  })}

                  {/* CPC */}
                  {periods.map(p => {
                    const spend = rowMap[p]?.spend || 0;
                    const clicks = rowMap[p]?.clicks || 0;
                    return <td key={p} style={tdStyle}>{clicks > 0 ? `₹${(spend / clicks).toFixed(2)}` : '—'}</td>;
                  })}

                  {/* CPM */}
                  {periods.map(p => {
                    const spend = rowMap[p]?.spend || 0;
                    const imp = rowMap[p]?.impressions || 0;
                    return <td key={p} style={tdStyle}>{imp > 0 ? `₹${((spend / imp) * 1000).toFixed(2)}` : '—'}</td>;
                  })}

                  {/* Link Clicks */}
                  {periods.map(p => <td key={p} style={tdStyle}>{Math.round(rowMap[p]?.link_clicks || 0).toLocaleString('en-IN')}</td>)}

                  {/* LC to LP */}
                  {periods.map(p => {
                    const lc = rowMap[p]?.link_clicks || 0;
                    const lp = rowMap[p]?.landing_page_views || 0;
                    return <td key={p} style={tdStyle}>{lc > 0 ? formatPct((lp / lc) * 100) : '—'}</td>;
                  })}

                  {/* Landing Page Views */}
                  {periods.map(p => <td key={p} style={tdStyle}>{Math.round(rowMap[p]?.landing_page_views || 0).toLocaleString('en-IN')}</td>)}

                  {/* Impressions */}
                  {periods.map(p => <td key={p} style={tdStyle}>{Math.round(rowMap[p]?.impressions || 0).toLocaleString('en-IN')}</td>)}

                  {/* Comparisons */}
                  <td style={tdStyle}>{formatComp(pctChange(currentSpend, prevSpend))}</td>
                  <td style={tdStyle}>{formatComp(pctChange(currentSpend, avg3))}</td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
