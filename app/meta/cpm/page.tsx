'use client';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';
import MetricsReport from '@/components/MetricsReport';
import { calcCPM, Funnel, FUNNELS } from '@/lib/metricUtils';
import DaysCountBadge from '@/components/DaysCountBadge';

export default function CPMPage() {
  const [category, setCategory] = useState('All');
  const [since, setSince]       = useState('');
  const [until, setUntil]       = useState('');
  
  const [monthlyData, setMonthlyData] = useState<Record<Funnel | string, Record<string, any>> | null>(null);
  const [dailyData, setDailyData]     = useState<Record<Funnel | string, Record<string, any>> | null>(null);
  const [periods, setPeriods]         = useState<{ months: string[], days: string[] } | null>(null);

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, since, until, _t: Date.now().toString() });
      const res = await fetch(`/api/meta-cpm?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch data');
      
      const addTotal = (dataMap: any) => {
        const totalFunnel: any = {};
        const allPeriods = new Set<string>();
        Object.values(dataMap).forEach((fData: any) => Object.keys(fData).forEach(p => allPeriods.add(p)));
        
        allPeriods.forEach(p => {
          let totalSpend = 0;
          let totalImp = 0;
          ['TOP', 'MID', 'BOTTOM', 'GROWTH'].forEach(f => {
            const fd = dataMap[f]?.[p];
            if (fd) {
              totalSpend += fd.spend || 0;
              totalImp += fd.impressions || 0;
            }
          });
          totalFunnel[p] = { spend: totalSpend, impressions: totalImp };
        });
        dataMap['Total'] = totalFunnel;
      };

      addTotal(data.monthly);
      addTotal(data.daily);

      if (!(FUNNELS as any).includes('Total')) {
        (FUNNELS as any).push('Total');
      }

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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>CPM (Meta)</h1>
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
          type="cpm"
          monthlyData={monthlyData}
          dailyData={dailyData}
          periods={periods}
          metricFn={(r) => calcCPM(r.spend, r.impressions)}
          metricLabel="CPM"
          extraColumns={[
            { key: 'spend', label: 'Amount Spent', format: (v) => `₹${(v || 0).toLocaleString('en-IN')}` },
            { key: 'impressions', label: 'Impressions' }
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
