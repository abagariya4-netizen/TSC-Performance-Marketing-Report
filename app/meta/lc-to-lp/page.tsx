'use client';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';
import MetricsReport from '@/components/MetricsReport';
import { calcLCtoLP, Funnel, FUNNELS } from '@/lib/metricUtils';
import DaysCountBadge from '@/components/DaysCountBadge';

export default function LCToLPPage() {
  const [category, setCategory] = useState('All');
  const [since, setSince]       = useState('');
  const [until, setUntil]       = useState('');
  
  const [monthlyData, setMonthlyData] = useState<Record<Funnel | string, Record<string, any>> | null>(null);
  const [dailyData, setDailyData]     = useState<Record<Funnel | string, Record<string, any>> | null>(null);
  const [periods, setPeriods]         = useState<{ months: string[], days: string[] } | null>(null);
  
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [debugData, setDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const fetchDebugData = async () => {
    setDebugLoading(true);
    setDebugData(null);
    setError(null);
    try {
      const params = new URLSearchParams({ category, since, until, debug: 'true' });
      const res = await fetch(`/api/meta-lc?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch debug data');
      setDebugData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDebugLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, since, until, _t: Date.now().toString() });
      const res = await fetch(`/api/meta-lc?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch data');
      
      const addTotal = (dataMap: any) => {
        const totalFunnel: any = {};
        const allPeriods = new Set<string>();
        Object.values(dataMap).forEach((fData: any) => Object.keys(fData).forEach(p => allPeriods.add(p)));
        
        allPeriods.forEach(p => {
          let totalLc = 0;
          let totalLp = 0;
          let totalSpend = 0;
          ['TOP', 'MID', 'BOTTOM', 'GROWTH'].forEach(f => {
            const fd = dataMap[f]?.[p];
            if (fd) {
              totalLc += fd.link_clicks || 0;
              totalLp += fd.landing_page_views || 0;
              totalSpend += fd.spend || 0;
            }
          });
          totalFunnel[p] = { link_clicks: totalLc, landing_page_views: totalLp, spend: totalSpend };
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>LC to LP (Meta)</h1>
        <DaysCountBadge />
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1 }}>
          <FilterBar 
            category={category} setCategory={setCategory}
            since={since} setSince={setSince}
            until={until} setUntil={setUntil}
            onGenerate={generateReport}
            loading={loading}
          />
        </div>
        <div style={{ padding: '16px 0' }}>
          <button 
            onClick={fetchDebugData}
            disabled={debugLoading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#0D1220', 
              border: '1px solid #F97316', 
              color: '#F97316', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              height: '38px'
            }}>
            {debugLoading ? 'Loading...' : '🔍 Raw Data'}
          </button>
        </div>
      </div>

      {debugData && (
        <div style={{ backgroundColor: '#0D1220', border: '1px solid #F97316', borderRadius: '8px', padding: '16px', marginBottom: '24px', color: 'white' }}>
          <div style={{ color: '#fc8181', fontWeight: 'bold', marginBottom: '16px' }}>⚠️ DEBUG MODE - Remove before production</div>
          
          <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ borderBottom: '1px solid #2D3A57', paddingBottom: '4px', marginBottom: '8px', color: '#a0aec0' }}>BEFORE FILTERING</h3>
              <div style={{ fontFamily: 'monospace' }}>Total adsets fetched: {debugData.totals?.raw?.adsets || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>Total Link Clicks: {debugData.totals?.raw?.lc || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>Total Landing Page Views: {debugData.totals?.raw?.lp || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>LC to LP%: {debugData.totals?.raw?.lc ? ((debugData.totals.raw.lp / debugData.totals.raw.lc) * 100).toFixed(2) : 0}%</div>
            </div>
            <div>
              <h3 style={{ borderBottom: '1px solid #2D3A57', paddingBottom: '4px', marginBottom: '8px', color: '#a0aec0' }}>AFTER FILTERING</h3>
              <div style={{ fontFamily: 'monospace' }}>Total adsets included: {debugData.totals?.included?.adsets || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>Total adsets excluded: {debugData.totals?.excluded?.adsets || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>Total Link Clicks: {debugData.totals?.included?.lc || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>Total Landing Page Views: {debugData.totals?.included?.lp || 0}</div>
              <div style={{ fontFamily: 'monospace' }}>LC to LP%: {debugData.totals?.included?.lc ? ((debugData.totals.included.lp / debugData.totals.included.lc) * 100).toFixed(2) : 0}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ marginBottom: '8px', color: '#a0aec0' }}>TOP 20 INCLUDED ADSETS</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A2336' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #2D3A57' }}>Campaign Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #2D3A57' }}>Adset Name</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #2D3A57' }}>Link Clicks</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #2D3A57' }}>LP Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugData.includedAdsets?.map((a: any, i: number) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#0D1220' : '#1A2336' }}>
                        <td style={{ padding: '4px 8px', border: '1px solid #2D3A57' }}>{a.campaign_name}</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #2D3A57' }}>{a.adset_name}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #2D3A57', fontFamily: 'monospace' }}>{a.link_clicks}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #2D3A57', fontFamily: 'monospace' }}>{a.landing_page_views}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ marginBottom: '8px', color: '#a0aec0' }}>TOP 20 EXCLUDED ADSETS</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1A2336' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #2D3A57' }}>Campaign Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #2D3A57' }}>Adset Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #2D3A57' }}>Exclusion Reason</th>
                      <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #2D3A57' }}>Link Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugData.excludedAdsets?.map((a: any, i: number) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#0D1220' : '#1A2336' }}>
                        <td style={{ padding: '4px 8px', border: '1px solid #2D3A57' }}>{a.campaign_name}</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #2D3A57' }}>{a.adset_name}</td>
                        <td style={{ padding: '4px 8px', border: '1px solid #2D3A57', color: '#fc8181' }}>{a.reason}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #2D3A57', fontFamily: 'monospace' }}>{a.link_clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

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
