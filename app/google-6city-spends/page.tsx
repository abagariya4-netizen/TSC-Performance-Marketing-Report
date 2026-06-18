'use client';
import React, { useState, useEffect, Suspense } from 'react';
import PlanUpload from '@/components/PlanUpload';
import Google6CityTable from '@/components/Google6CityTable';
import { parseGoogle6CityPlanCSV } from '@/lib/csvParser';

function PageContent() {
  const [plan, setPlan] = useState<Record<string,Record<string,number>> | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const rp = localStorage.getItem('tsc_google_6city_plan');
    if (rp) setPlan(JSON.parse(rp));
  }, []);

  const handlePlanUpload = (text: string) => {
    const parsed = parseGoogle6CityPlanCSV(text);
    setPlan(parsed);
    localStorage.setItem('tsc_google_6city_plan', JSON.stringify(parsed));
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/google-6city-spends');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date().toLocaleString('en-IN'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ color: 'white', padding: '0 24px 24px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        {data && (
          <div style={{ background: '#1a1d27', display: 'inline-block', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#90cdf4' }}>
            {data.dates.displayMonth} | Day {data.dates.daysPassed} of {data.dates.totalDays} | {data.dates.daysRemaining} days remaining
          </div>
        )}
      </div>

      {!plan ? (
        <div style={{ background: '#1a1d27', borderRadius: '12px', padding: '32px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ marginBottom: '24px', color: '#90cdf4' }}>Upload your 6 City Google Plan CSV to get started (v2.1)</p>
          <PlanUpload label="6 City Google Plan" onLoad={handlePlanUpload} loaded={false} count={0} unit="cities" />
        </div>
      ) : (
        <>
          <div style={{ background: '#1a3a2a', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{color: '#48bb78', fontWeight: 'bold', fontSize: '14px'}}>v2.1</span>
            <PlanUpload label="6 City Google Plan" onLoad={handlePlanUpload} loaded={true} count={Object.keys(plan).length} unit="cities" compact />
            
            <button onClick={generateReport} disabled={loading}
              style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: '#e8733a', color: 'white', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
            </button>
          </div>

          {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

          {data && (
            <Google6CityTable data={data} plan={plan} />
          )}

          {lastUpdated && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
              Last updated: {lastUpdated}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function Google6CitySpendsPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '24px' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
