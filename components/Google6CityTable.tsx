'use client';
import React, { useState } from 'react';
import { calcRow, formatINR } from '@/lib/calculations';

export default function Google6CityTable({ data, plan }: { data: any, plan: Record<string, Record<string, number>> }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCity = (city: string) => {
    const newCol = new Set(collapsed);
    if (newCol.has(city)) newCol.delete(city);
    else newCol.add(city);
    setCollapsed(newCol);
  };

  const cities = ["Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Gujarat", "Delhi+NCR"];
  const funnels = ["Search Non-Brand New", "Search Non-Brand Old", "Search Brand", "Demand Gen Video", "Demand Gen Clicks", "Performance Max", "Shopping", "Display"];

  let gtMtd = 0, gtYday = 0, gtPlan = 0;

  const renderRow = (r: any, isSubRow = false, isFunnelTotal = false, isGrandTotal = false) => {
    const diffColor = r.diffPct > 0 ? '#48bb78' : r.diffPct < 0 ? '#fc8181' : '#ecc94b';
    const pillHtml = r.overUnder === 'Over'
      ? <span style={{ background: '#1a3a2a', color: '#48bb78', border: '1px solid #276749', borderRadius: '999px', padding: '2px 10px' }}>Over</span>
      : r.overUnder === 'Under'
      ? <span style={{ background: '#3a1a1a', color: '#fc8181', border: '1px solid #742a2a', borderRadius: '999px', padding: '2px 10px' }}>Under</span>
      : '—';

    const bg = isGrandTotal ? '#0d2137' : '#1a1d27';
    const weight = (isFunnelTotal || isGrandTotal) ? 'bold' : 'normal';

    return (
      <tr key={r.id} style={{ background: bg, fontWeight: weight }}>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'left', paddingLeft: isSubRow ? '30px' : '12px' }}>{r.name}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.plan)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.mtd)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.yday)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748' }}>{formatINR(r.est)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', color: r.plan != null ? diffColor : 'inherit' }}>
          {r.plan != null ? `${r.diffPct > 0 ? '+' : ''}${r.diffPct}%` : '—'}
        </td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', color: r.estMinusPlan != null ? (r.estMinusPlan < 0 ? '#fc8181' : '#48bb78') : 'inherit' }}>{formatINR(r.estMinusPlan)}</td>
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #2d3748', textAlign: 'center' }}>{pillHtml}</td>
      </tr>
    );
  };

  const exportCSV = () => {
    const headers = [
      'Region', 'Overall (Plan)', 'MTD', 'Yesterday',
      'Est. Spends', 'Difference', 'Est - Plan', 'Over/Under'
    ];

    const lines: string[] = [];
    lines.push(headers.join(','));

    let totalNamedMtd = 0, totalNamedYday = 0;

    cities.forEach(city => {
      const cityPlan = plan[city] || {};
      
      lines.push(`"${city}",,,,,,,`);
      
      let cityMtd = 0, cityYday = 0, cityPlanTotal = 0;

      funnels.forEach(f => {
        const p = cityPlan[f] ?? null;
        const m = data.data[city]?.[f]?.mtd || 0;
        const y = data.data[city]?.[f]?.yday || 0;
        
        cityMtd += m;
        cityYday += y;
        if (p != null) cityPlanTotal += p;

        const rowData = calcRow(m, y, p, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
        lines.push([
          `"${f}"`,
          p != null ? p : '',
          m,
          y,
          rowData.est,
          rowData.diffPct != null ? `${rowData.diffPct}%` : '',
          rowData.estMinusPlan != null ? rowData.estMinusPlan : '',
          rowData.overUnder ?? ''
        ].join(','));
      });
      
      totalNamedMtd += cityMtd;
      totalNamedYday += cityYday;

      const cityTotalPlan = cityPlan['Total'] ?? cityPlanTotal;
      const cityRow = calcRow(cityMtd, cityYday, cityTotalPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
      
      lines.push([
        '"Total"',
        cityTotalPlan,
        cityMtd,
        cityYday,
        cityRow.est,
        cityRow.diffPct != null ? `${cityRow.diffPct}%` : '',
        cityRow.estMinusPlan != null ? cityRow.estMinusPlan : '',
        cityRow.overUnder ?? ''
      ].join(','));
    });
    
    // Add Unknown
    const unknownMtd = data.data.campaign_total_mtd - data.data.geo_total_mtd;
    const unknownYday = data.data.campaign_total_yday - data.data.geo_total_yday;
    const unknownPlan = plan['Unknown']?.['Total'] ?? null;
    const unknownRow = calcRow(unknownMtd, unknownYday, unknownPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
    lines.push([
      '"Unknown"', unknownPlan ?? '', unknownMtd, unknownYday, unknownRow.est, 
      unknownRow.diffPct != null ? `${unknownRow.diffPct}%` : '', 
      unknownRow.estMinusPlan != null ? unknownRow.estMinusPlan : '', 
      unknownRow.overUnder ?? ''
    ].join(','));

    // Add Rest
    const restMtd = data.data.campaign_total_mtd - totalNamedMtd - unknownMtd;
    const restYday = data.data.campaign_total_yday - totalNamedYday - unknownYday;
    const restPlan = plan['Rest']?.['Total'] ?? null;
    const restRow = calcRow(restMtd, restYday, restPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
    lines.push([
      '"Rest of India"', restPlan ?? '', restMtd, restYday, restRow.est, 
      restRow.diffPct != null ? `${restRow.diffPct}%` : '', 
      restRow.estMinusPlan != null ? restRow.estMinusPlan : '', 
      restRow.overUnder ?? ''
    ].join(','));
    
    // Add Grand Total
    let finalGtPlan = 0;
    cities.forEach(c => finalGtPlan += (plan[c]?.['Total'] || 0));
    finalGtPlan += (plan['Unknown']?.['Total'] || 0) + (plan['Rest']?.['Total'] || 0);

    const gtRow = calcRow(data.data.campaign_total_mtd, data.data.campaign_total_yday, finalGtPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
    lines.push([
      '"Grand Total"', finalGtPlan, data.data.campaign_total_mtd, data.data.campaign_total_yday, gtRow.est,
      gtRow.diffPct != null ? `${gtRow.diffPct}%` : '',
      gtRow.estMinusPlan != null ? gtRow.estMinusPlan : '',
      gtRow.overUnder ?? ''
    ].join(','));

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSC_Google_6City_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  let totalNamedMtd = 0, totalNamedYday = 0;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: '10px', textAlign: 'right' }}>
        <button onClick={exportCSV} style={{ background: 'transparent', border: '1px solid #4a5568', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ background: '#e8733a', color: 'white', fontWeight: 'bold' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>Region / Campaign Type</th>
            <th style={{ padding: '10px 12px' }}>Overall (Plan)</th>
            <th style={{ padding: '10px 12px' }}>MTD</th>
            <th style={{ padding: '10px 12px' }}>Yesterday</th>
            <th style={{ padding: '10px 12px' }}>Est. Spends</th>
            <th style={{ padding: '10px 12px' }}>Difference</th>
            <th style={{ padding: '10px 12px' }}>Est - Plan</th>
            <th style={{ padding: '10px 12px' }}>Over/Under</th>
          </tr>
        </thead>
        <tbody>
          {cities.map(city => {
            const isCol = collapsed.has(city);
            const cityPlan = plan[city] || {};
            
            let cityMtd = 0, cityYday = 0, cityPlanTotal = 0;

            const subRows = funnels.map(f => {
              const p = cityPlan[f] ?? null;
              const m = data.data[city]?.[f]?.mtd || 0;
              const y = data.data[city]?.[f]?.yday || 0;
              cityMtd += m;
              cityYday += y;
              if (p != null) cityPlanTotal += p;
              const rowData = calcRow(m, y, p, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
              return renderRow({ id: `${city}-${f}`, name: f, plan: p, ...rowData }, true, false);
            });

            totalNamedMtd += cityMtd;
            totalNamedYday += cityYday;

            const cityTotalPlan = cityPlan['Total'] ?? cityPlanTotal;
            const cityRowData = calcRow(cityMtd, cityYday, cityTotalPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
            gtPlan += cityTotalPlan;

            return (
              <React.Fragment key={city}>
                <tr onClick={() => toggleCity(city)} style={{ background: '#e8733a', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  <td colSpan={8} style={{ padding: '10px 12px', textAlign: 'left' }}>
                    {isCol ? '▶' : '▼'} {city}
                  </td>
                </tr>
                {!isCol && subRows}
                {!isCol && renderRow({ id: `${city}-Total`, name: 'Total', plan: cityTotalPlan, ...cityRowData }, false, true)}
              </React.Fragment>
            );
          })}
          
          {/* Unknown Row */}
          {(() => {
            const unknownMtd = data.data.campaign_total_mtd - data.data.geo_total_mtd;
            const unknownYday = data.data.campaign_total_yday - data.data.geo_total_yday;
            const unknownPlan = plan['Unknown']?.['Total'] ?? null;
            if (unknownPlan) gtPlan += unknownPlan;
            const unknownRow = calcRow(unknownMtd, unknownYday, unknownPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
            return renderRow({ id: 'Unknown', name: 'Unknown', plan: unknownPlan, ...unknownRow }, false, true);
          })()}

          {/* Rest Row */}
          {(() => {
            const unknownMtd = data.data.campaign_total_mtd - data.data.geo_total_mtd;
            const unknownYday = data.data.campaign_total_yday - data.data.geo_total_yday;
            const restMtd = data.data.campaign_total_mtd - totalNamedMtd - unknownMtd;
            const restYday = data.data.campaign_total_yday - totalNamedYday - unknownYday;
            const restPlan = plan['Rest']?.['Total'] ?? null;
            if (restPlan) gtPlan += restPlan;
            const restRow = calcRow(restMtd, restYday, restPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
            return renderRow({ id: 'Rest', name: 'Rest of India', plan: restPlan, ...restRow }, false, true);
          })()}

          {/* Grand Total Row */}
          {(() => {
            const gtRow = calcRow(data.data.campaign_total_mtd, data.data.campaign_total_yday, gtPlan, data.dates.daysPassed, data.dates.totalDays, data.dates.daysRemaining);
            return renderRow({ id: 'GT', name: 'Grand Total', plan: gtPlan, ...gtRow }, false, false, true);
          })()}

        </tbody>
      </table>
    </div>
  );
}
