'use client';
import { useState, useEffect } from 'react';
import RegionTable from '@/components/RegionTable';
import CityTable from '@/components/CityTable';
import PlanUpload from '@/components/PlanUpload';
import { parseRegionPlanCSV, parseCityPlanCSV } from '@/lib/csvParser';
import DaysCountBadge from '@/components/DaysCountBadge';

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
    <main className="container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
          {activeTab === 'region' ? 'Region Level Spends (Meta)' : '6 City (Meta)'}
        </h1>
        <DaysCountBadge />
      </div>

      {!anyPlanLoaded ? (
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Upload your plan CSVs to get started</p>
          <PlanUpload label="Region Plan CSV" onLoad={handleRegionPlanUpload} loaded={!!regionPlan} count={regionPlan ? Object.keys(regionPlan).length : 0} unit="regions" />
          <div style={{ marginTop: '16px' }}>
            <PlanUpload label="6 City Plan CSV" onLoad={handleCityPlanUpload} loaded={!!cityPlan} count={cityPlan ? Object.keys(cityPlan).length : 0} unit="cities" />
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PlanUpload label="Region Plan" onLoad={handleRegionPlanUpload} loaded={!!regionPlan} count={regionPlan ? Object.keys(regionPlan).length : 0} unit="regions" compact />
            <PlanUpload label="6 City Plan" onLoad={handleCityPlanUpload} loaded={!!cityPlan} count={cityPlan ? Object.keys(cityPlan).length : 0} unit="cities" compact />
            
            <button 
              onClick={generateReport} 
              disabled={loading}
              className="btn-primary"
              style={{ marginLeft: 'auto' }}
            >
              {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
            </button>
          </div>

          {error && <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger-color)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>{error}</div>}

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
