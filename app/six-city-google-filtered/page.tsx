'use client';

import React, { useState, useEffect } from 'react';
import PlanUpload from '@/components/PlanUpload';
import DaysCountBadge from '@/components/DaysCountBadge';

const formatIndianNum = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(Math.round(num));
};

export default function SixCityGoogleFiltered() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<Record<string, Record<string, number>> | null>(null);

  const [category, setCategory] = useState('All');
  const [city, setCity] = useState('Maharashtra');

  const categories = ['All', 'Mattress', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];
  const cities = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Delhi+NCR', 'Gujarat'];

  useEffect(() => {
    const savedPlan = localStorage.getItem('tsc_six_city_google_filtered_plan');
    if (savedPlan) {
      parsePlan(savedPlan);
    }
  }, []);

  const parsePlan = (csvText: string) => {
    try {
      const lines = csvText.split('\n');
      const plan: Record<string, Record<string, number>> = {};
      
      lines.forEach((line, index) => {
        if (index === 0) return;
        if (!line.trim()) return;
        const row = line.match(/(?:"([^"]*)")|([^,]+)/g);
        if (row && row.length >= 3) {
          const c = row[0].replace(/^"|"$/g, '').trim();
          const type = row[1].replace(/^"|"$/g, '').trim();
          const val = parseFloat(row[2].replace(/,/g, ''));
          if (!plan[c]) plan[c] = {};
          if (!isNaN(val)) plan[c][type] = val;
        }
      });
      setPlanData(plan);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlanUpload = (csvText: string) => {
    localStorage.setItem('tsc_six_city_google_filtered_plan', csvText);
    parsePlan(csvText);
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/six-city-google-filtered?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`;
      const mapping = localStorage.getItem('tsc_google_city_mapping');
      if (mapping) {
        url += `&mapping=${encodeURIComponent(mapping)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch data');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data || !data.rows) return;
    const { dayOfMonth: daysPassed, daysRemaining, totalDays } = data.dateInfo;
    
    let csv = 'City/Campaign Type,Overall (Plan),MTD,Yesterday,Est. Spends,Difference,Est - Plan,Over/Under\n';
    
    const campaignTypes = ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    
    // Total Row
    const stateToCityBucket: Record<string, string> = {
      'Maharashtra': 'Mumbai', 'Karnataka': 'Bengaluru', 'Tamil Nadu': 'Chennai',
      'Telangana': 'Hyderabad', 'Delhi+NCR': 'Delhi+NCR', 'Gujarat': 'Gujarat'
    };
    const mappedCity = stateToCityBucket[city];
    const cityPlan = planData?.[mappedCity] || {};
    const totalPlan = cityPlan['Total'] || 0;
    
    const estSpendsTotal = data.total.mtd + (data.total.yesterday * daysRemaining);
    const estMinusPlanTotal = estSpendsTotal - totalPlan;
    const overUnderTotal = estSpendsTotal >= totalPlan ? 'Over' : 'Under';
    let diffPercentTotal = 0;
    if (totalPlan > 0 && daysPassed > 0) {
      diffPercentTotal = ((data.total.mtd / (totalPlan * (daysPassed / totalDays))) - 1) * 100;
    }

    csv += `"${mappedCity} (Total)",${totalPlan || ''},${data.total.mtd.toFixed(2)},${data.total.yesterday.toFixed(2)},${estSpendsTotal.toFixed(2)},${totalPlan ? diffPercentTotal.toFixed(2) + '%' : ''},${totalPlan ? estMinusPlanTotal.toFixed(2) : ''},${totalPlan ? overUnderTotal : ''}\n`;

    // Child Rows
    campaignTypes.forEach(type => {
      const rowData = data.rows[type];
      if (!rowData) return;
      const typePlan = cityPlan[type] || 0;
      const estSpends = rowData.mtd + (rowData.yesterday * daysRemaining);
      const estMinusPlan = estSpends - typePlan;
      const overUnder = estSpends >= typePlan ? 'Over' : 'Under';
      let diffPercent = 0;
      if (typePlan > 0 && daysPassed > 0) {
        diffPercent = ((rowData.mtd / (typePlan * (daysPassed / totalDays))) - 1) * 100;
      }
      csv += `"${type}",${typePlan || ''},${rowData.mtd.toFixed(2)},${rowData.yesterday.toFixed(2)},${estSpends.toFixed(2)},${typePlan ? diffPercent.toFixed(2) + '%' : ''},${typePlan ? estMinusPlan.toFixed(2) : ''},${typePlan ? overUnder : ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Google_6City_Filtered_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (!data || !data.rows) return null;
    const { dayOfMonth: daysPassed, daysRemaining, totalDays } = data.dateInfo;
    const campaignTypes = ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    
    const stateToCityBucket: Record<string, string> = {
      'Maharashtra': 'Mumbai', 'Karnataka': 'Bengaluru', 'Tamil Nadu': 'Chennai',
      'Telangana': 'Hyderabad', 'Delhi+NCR': 'Delhi+NCR', 'Gujarat': 'Gujarat'
    };
    const mappedCity = stateToCityBucket[city];
    const cityPlan = planData?.[mappedCity] || {};
    const totalPlan = cityPlan['Total'] || 0;

    const renderRow = (campaignType: string, rowData: any, planValue: number, isTotal = false) => {
      const estSpends = rowData.mtd + (rowData.yesterday * daysRemaining);
      const estMinusPlan = estSpends - planValue;
      const overUnder = estSpends >= planValue ? 'Over' : 'Under';

      let diffPercent = 0;
      if (planValue > 0 && daysPassed > 0) {
        const proratedPlan = planValue * (daysPassed / totalDays);
        diffPercent = ((rowData.mtd / proratedPlan) - 1) * 100;
      }

      const diffColor = diffPercent >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

      return (
        <tr key={campaignType} style={{ backgroundColor: isTotal ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
          <td style={{ textAlign: 'left', paddingLeft: isTotal ? '12px' : '32px', fontWeight: isTotal ? 'bold' : 'normal', borderRight: '1px solid var(--border-color)' }}>
            {isTotal ? `${mappedCity} (Total)` : campaignType}
          </td>
          <td>{planValue ? formatIndianNum(planValue) : '-'}</td>
          <td>{formatIndianNum(rowData.mtd)}</td>
          <td>{formatIndianNum(rowData.yesterday)}</td>
          <td>{formatIndianNum(estSpends)}</td>
          <td style={{ color: diffColor }}>
            {planValue > 0 ? `${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(2)}%` : '-'}
          </td>
          <td style={{ color: estMinusPlan >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {planValue > 0 ? formatIndianNum(estMinusPlan) : '-'}
          </td>
          <td style={{ textAlign: 'center' }}>
            {planValue > 0 ? (
               <span style={{ 
                 padding: '2px 10px', 
                 borderRadius: '999px', 
                 fontSize: '12px', 
                 fontWeight: 'bold',
                 backgroundColor: overUnder === 'Over' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                 color: overUnder === 'Over' ? 'var(--success-color)' : 'var(--danger-color)',
                 border: overUnder === 'Over' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)'
               }}>
                 {overUnder}
               </span>
            ) : '-'}
          </td>
        </tr>
      );
    };

    return (
      <div style={{ marginBottom: '32px' }}>
        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>City/Campaign Type</th>
                <th style={{ textAlign: 'center' }}>Overall (Plan)</th>
                <th style={{ textAlign: 'center' }}>MTD</th>
                <th style={{ textAlign: 'center' }}>Yesterday</th>
                <th style={{ textAlign: 'center' }}>Est. Spends</th>
                <th style={{ textAlign: 'center' }}>Difference</th>
                <th style={{ textAlign: 'center' }}>Est - Plan</th>
                <th style={{ textAlign: 'center' }}>Over/Under</th>
              </tr>
            </thead>
            <tbody>
              {renderRow('Total', data.total, totalPlan, true)}
              {campaignTypes.map(type => {
                const typePlan = cityPlan[type] || 0;
                const rowData = data.rows[type] || { mtd: 0, yesterday: 0 };
                return renderRow(type, rowData, typePlan, false);
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>6 City Filtered (Google)</h1>
            <DaysCountBadge />
          </div>
          <button onClick={exportCSV} className="btn-outline">
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <PlanUpload 
          label="Change Plan" 
          onLoad={handlePlanUpload} 
          loaded={!!planData} 
          count={planData ? Object.keys(planData).length : 0} 
          unit="cities" 
        />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Category:</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
            style={{ minWidth: '140px' }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>City:</label>
          <select 
            value={city} 
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
            style={{ minWidth: '140px' }}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button 
          onClick={generateReport} 
          disabled={loading || !planData}
          className="btn-primary"
        >
          {loading ? '⏳ Loading...' : '🔄 Generate Report'}
        </button>

        {error && <span style={{ color: 'var(--danger-color)', marginLeft: '12px' }}>{error}</span>}
      </div>

      {data && !loading && renderTable()}
    </div>
  );
}
