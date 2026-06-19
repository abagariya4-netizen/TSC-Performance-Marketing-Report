'use client';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';
import MetricsReport from '@/components/MetricsReport';
import { calcLCtoLP, Funnel } from '@/lib/metricUtils';
import DaysCountBadge from '@/components/DaysCountBadge';

export default function LCToLPPage() {
  const [category, setCategory] = useState('All');
  const [since, setSince]       = useState('');
  const [until, setUntil]       = useState('');
  
  const [monthlyData, setMonthlyData] = useState<Record<Funnel, Record<string, any>> | null>(null);
  const [dailyData, setDailyData]     = useState<Record<Funnel, Record<string, any>> | null>(null);
  const [periods, setPeriods]         = useState<{ months: string[], days: string[] } | null>(null);
  
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, since, until });
      const res = await fetch(`/api/meta-lc?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch data');
      
      setMonthlyData(data.monthly);
      setDailyData(data.daily);
      setPeriods(data.periods);
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>LC to LP (Meta)</h1>
        <DaysCountBadge />
      </div>
      <FilterBar 
        category={category} setCategory={setCategory}
        since={since} setSince={setSince}
        until={until} setUntil={setUntil}
        onGenerate={generateReport}
        loading={loading}
      />

      {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {(monthlyData && dailyData && periods) && (
        <MetricsReport 
          type="lc"
          monthlyData={monthlyData}
          dailyData={dailyData}
          periods={periods}
          metricFn={(r) => calcLCtoLP(r.landing_page_views, r.link_clicks)}
          metricLabel="LC to LP %"
          extraColumns={[
            { key: 'link_clicks', label: 'Link Clicks' },
            { key: 'landing_page_views', label: 'Landing Page Views' }
          ]}
        />
      )}

      {lastUpdated && (
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
          Last updated: {lastUpdated}
        </div>
      )}
    </main>
  );
}
