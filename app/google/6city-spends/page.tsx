'use client';

import { useState, useEffect } from 'react';
import PlanUpload from '@/components/PlanUpload';
import Google6CityTable from '@/components/Google6CityTable';
import { parseGoogle6CityPlanCSV } from '@/lib/csvParser';
import DaysCountBadge from '@/components/DaysCountBadge';

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
      let url = '/api/google-6city-spends';
      const mapping = localStorage.getItem('tsc_google_city_mapping');
      if (mapping) {
        url += `?mapping=${encodeURIComponent(mapping)}`;
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
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>6 City (Google)</h1>
            <DaysCountBadge />
          </div>
          <button onClick={exportCSV} className="btn-outline">
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <PlanUpload 
          label="6 City Plan" 
          onLoad={handlePlanUpload} 
          loaded={!!planData} 
          count={planData ? Object.keys(planData).length : 0} 
          unit="cities" 
        />
        
        <button 
          onClick={fetchData} 
          disabled={loading || !planData}
          className="btn-primary"
        >
          {loading ? '⏳ Loading...' : '🔄 Generate Report'}
        </button>

        {error && <span style={{ color: 'var(--danger-color)', marginLeft: '12px' }}>{error}</span>}
      </div>

      {data && !loading && (
        <Google6CityTable data={data} planData={planData} />
      )}
    </div>
  );
}
