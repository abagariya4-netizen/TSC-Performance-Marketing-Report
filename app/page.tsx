'use client';
import { useState, useEffect } from 'react';
import RegionTable from '@/components/RegionTable';
import CityTable from '@/components/CityTable';
import PlanUpload from '@/components/PlanUpload';
import { parseRegionPlanCSV, parseCityPlanCSV } from '@/lib/csvParser';

import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

type Tab = 'region' | '6city';

function HomeContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab]       = useState<Tab>('region');
  const [regionPlan, setRegionPlan]     = useState<Record<string,number> | null>(null);
  const [cityPlan, setCityPlan]         = useState<Record<string,Record<string,number>> | null>(null);
  const [regionData, setRegionData]     = useState<any>(null);
  const [cityData, setCityData]         = useState<any>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [dateInfo, setDateInfo]         = useState<any>(null);

  useEffect(() => {
    if (tabParam === '6city') {
      setActiveTab('6city');
    } else {
      setActiveTab('region');
    }
  }, [tabParam]);

  useEffect(() => {
    const rp = localStorage.getItem('tsc_region_plan');
    const cp = localStorage.getItem('tsc_city_funnel_plan');
    if (rp) setRegionPlan(JSON.parse(rp));
    if (cp) setCityPlan(JSON.parse(cp));
  }, []);

  const handleRegionPlanUpload = (text: string) => {
    const plan = parseRegionPlanCSV(text);
    setRegionPlan(plan);
    localStorage.setItem('tsc_region_plan', JSON.stringify(plan));
  };

  const handleCityPlanUpload = (text: string) => {
    const plan = parseCityPlanCSV(text);
    setCityPlan(plan);
    localStorage.setItem('tsc_city_funnel_plan', JSON.stringify(plan));
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'region') {
        const res  = await fetch('/api/meta-region');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setRegionData(data);
        setDateInfo(data.dates);
      } else {
        const res  = await fetch('/api/meta-6city');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setCityData(data);
        setDateInfo(data.dates);
      }
      setLastUpdated(new Date().toLocaleString('en-IN'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const anyPlanLoaded = regionPlan || cityPlan;

  return (
    <main style={{ color: 'white', padding: '0 24px 24px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        {dateInfo && (
          <div style={{ background: '#1a1d27', display: 'inline-block', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#90cdf4' }}>
            {dateInfo.displayMonth} | Day {dateInfo.daysPassed} of {dateInfo.totalDays} | {dateInfo.daysRemaining} days remaining
          </div>
        )}
      </div>

      {!anyPlanLoaded ? (
        <div style={{ background: '#1a1d27', borderRadius: '12px', padding: '32px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ marginBottom: '24px', color: '#90cdf4' }}>Upload your plan CSVs to get started</p>
          <PlanUpload label="Region Plan CSV" onLoad={handleRegionPlanUpload} loaded={!!regionPlan} count={regionPlan ? Object.keys(regionPlan).length : 0} unit="regions" />
          <div style={{ marginTop: '16px' }}>
            <PlanUpload label="6 City Plan CSV" onLoad={handleCityPlanUpload} loaded={!!cityPlan} count={cityPlan ? Object.keys(cityPlan).length : 0} unit="cities" />
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: '#1a3a2a', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PlanUpload label="Region Plan" onLoad={handleRegionPlanUpload} loaded={!!regionPlan} count={regionPlan ? Object.keys(regionPlan).length : 0} unit="regions" compact />
            <PlanUpload label="6 City Plan" onLoad={handleCityPlanUpload} loaded={!!cityPlan} count={cityPlan ? Object.keys(cityPlan).length : 0} unit="cities" compact />
            
            <button onClick={generateReport} disabled={loading}
              style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: '#e8733a', color: 'white', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
            </button>
          </div>

          {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

          {activeTab === 'region' && regionData && (
            <RegionTable data={regionData} plan={regionPlan || {}} />
          )}
          {activeTab === '6city' && cityData && (
            <CityTable data={cityData} plan={cityPlan || {}} />
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

export default function Home() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '24px' }}>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
