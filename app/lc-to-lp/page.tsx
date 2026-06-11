'use client';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';
import MetricsReport, { MetricRow } from '@/components/MetricsReport';
import { calcLCtoLP } from '@/lib/metricUtils';

export default function LCToLPPage() {
  const [category, setCategory] = useState('All');
  const [funnel, setFunnel]     = useState('All');
  const [since, setSince]       = useState('');
  const [until, setUntil]       = useState('');
  
  const [monthlyData, setMonthlyData] = useState<MetricRow[]>([]);
  const [dailyData, setDailyData]     = useState<MetricRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, funnel, since, until });
      const res = await fetch(`/api/meta-lc?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch data');
      
      setMonthlyData(data.monthly || []);
      setDailyData(data.daily || []);
      setLastUpdated(new Date().toLocaleString('en-IN'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ background: '#0f1117', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <FilterBar 
        category={category} setCategory={setCategory}
        funnel={funnel} setFunnel={setFunnel}
        since={since} setSince={setSince}
        until={until} setUntil={setUntil}
        onGenerate={generateReport}
        loading={loading}
      />

      {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {(monthlyData.length > 0 || dailyData.length > 0) && (
        <MetricsReport 
          type="lc"
          monthlyData={monthlyData}
          dailyData={dailyData}
          metricFn={(r) => calcLCtoLP(r.link_clicks, r.landing_page_views)}
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
