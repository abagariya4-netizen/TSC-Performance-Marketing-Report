'use client';

import { useState, useEffect, Suspense } from 'react';
import NavBar from '@/components/NavBar';
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
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0f1117', minHeight: '100vh', padding: '24px', color: 'white', fontFamily: 'sans-serif' }}>
      <Suspense fallback={<div>Loading nav...</div>}>
        <NavBar />
      </Suspense>
      
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
            onClick={() => alert("CSV Export not fully implemented yet")}
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
