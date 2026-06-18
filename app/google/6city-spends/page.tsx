'use client';

import { useState, useEffect } from 'react';
import PlanUpload from '@/components/PlanUpload';
import Google6CityTable from '@/components/Google6CityTable';
import { parseGoogle6CityPlanCSV } from '@/lib/csvParser';

export default function Google6CitySpends() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<Record<string, Record<string, number>> | null>(null);

  useEffect(() => {
    const savedPlan = localStorage.getItem('tsc_google_6city_plan');
    if (savedPlan) {
      setPlanData(parseGoogle6CityPlanCSV(savedPlan));
    }
    fetchData();
  }, []);

  const handlePlanUpload = (csvText: string) => {
    localStorage.setItem('tsc_google_6city_plan', csvText);
    setPlanData(parseGoogle6CityPlanCSV(csvText));
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/google-6city-spends');
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
    if (!data || !data.cities) return;
    const { dayOfMonth: daysPassed, daysRemaining, totalDays } = data.dateInfo;
    
    let csv = 'City,Campaign Type,Overall (Plan),MTD,Yesterday,Est. Spends,Difference,Est - Plan,Over/Under\n';
    
    const campaignTypes = ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    
    const cities = ['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Gujarat', 'Delhi+NCR'];
    
    let grandPlan = 0;

    cities.forEach(cityName => {
      const cityData = data.cities[cityName];
      if (!cityData) return;
      const cityPlan = planData?.[cityName] || {};
      const totalPlan = cityPlan['Total'] || 0;
      if (totalPlan) grandPlan += totalPlan;

      // Add Total Row
      const estSpendsTotal = cityData.total.mtd + (cityData.total.yesterday * daysRemaining);
      const estMinusPlanTotal = estSpendsTotal - totalPlan;
      const overUnderTotal = estSpendsTotal >= totalPlan ? 'Over' : 'Under';
      let diffPercentTotal = 0;
      if (totalPlan > 0 && daysPassed > 0) {
        diffPercentTotal = ((cityData.total.mtd / (totalPlan * (daysPassed / totalDays))) - 1) * 100;
      }

      csv += `"${cityName}","Total",${totalPlan || ''},${cityData.total.mtd.toFixed(2)},${cityData.total.yesterday.toFixed(2)},${estSpendsTotal.toFixed(2)},${totalPlan ? diffPercentTotal.toFixed(2) + '%' : ''},${totalPlan ? estMinusPlanTotal.toFixed(2) : ''},${totalPlan ? overUnderTotal : ''}\n`;

      // Add Child Rows
      campaignTypes.forEach(type => {
        const rowData = cityData[type];
        if (!rowData) return;
        const typePlan = cityPlan[type] || 0;
        const estSpends = rowData.mtd + (rowData.yesterday * daysRemaining);
        const estMinusPlan = estSpends - typePlan;
        const overUnder = estSpends >= typePlan ? 'Over' : 'Under';
        let diffPercent = 0;
        if (typePlan > 0 && daysPassed > 0) {
          diffPercent = ((rowData.mtd / (typePlan * (daysPassed / totalDays))) - 1) * 100;
        }
        csv += `"${cityName}","${type}",${typePlan || ''},${rowData.mtd.toFixed(2)},${rowData.yesterday.toFixed(2)},${estSpends.toFixed(2)},${typePlan ? diffPercent.toFixed(2) + '%' : ''},${typePlan ? estMinusPlan.toFixed(2) : ''},${typePlan ? overUnder : ''}\n`;
      });
    });

    // Grand Total Row
    const grandEstSpends = data.grandTotal.mtd + (data.grandTotal.yesterday * daysRemaining);
    const grandEstMinusPlan = grandEstSpends - grandPlan;
    let grandDiffPercent = 0;
    if (grandPlan > 0 && daysPassed > 0) {
      grandDiffPercent = ((data.grandTotal.mtd / (grandPlan * (daysPassed / totalDays))) - 1) * 100;
    }
    csv += `"Grand Total","",${grandPlan || ''},${data.grandTotal.mtd.toFixed(2)},${data.grandTotal.yesterday.toFixed(2)},${grandEstSpends.toFixed(2)},${grandPlan ? grandDiffPercent.toFixed(2) + '%' : ''},${grandPlan ? grandEstMinusPlan.toFixed(2) : ''},\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Google_6City_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#0f1117', minHeight: '100vh', padding: '24px', color: 'white', fontFamily: 'sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>6 City (Google) Report</h1>
          {data && data.dateInfo && (
            <div style={{ 
              display: 'inline-block', 
              marginTop: '8px', 
              padding: '4px 12px', 
              backgroundColor: '#2d3748', 
              borderRadius: '16px', 
              fontSize: '14px', 
              color: '#a0aec0' 
            }}>
              {data.dateInfo.monthName} | Day {data.dateInfo.dayOfMonth} of {data.dateInfo.totalDays} | {data.dateInfo.daysRemaining} days remaining
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <PlanUpload
            label="6 City Google Plan"
            onLoad={handlePlanUpload}
            loaded={!!planData}
            count={planData ? Object.keys(planData).length : 0}
            unit="cities"
            compact={true}
          />
          <button 
            onClick={fetchData}
            style={{ 
              backgroundColor: '#e8733a', 
              color: 'white', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          <button 
            style={{ 
              backgroundColor: '#2d3748', 
              color: 'white', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              border: '1px solid #4a5568', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={exportCSV}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px' }}>Error: {error}</div>}

      {data && !loading && (
        <Google6CityTable data={data} planData={planData} />
      )}
    </div>
  );
}
