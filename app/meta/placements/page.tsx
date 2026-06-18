'use client';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';
import PlacementsTable from '@/components/PlacementsTable';

export default function PlacementsPage() {
  const [category, setCategory] = useState('All');
  const [funnel, setFunnel]     = useState('All');
  const [since, setSince]       = useState('');
  const [until, setUntil]       = useState('');
  
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, funnel, since, until });
      const res = await fetch(`/api/meta-placements?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to fetch data');
      
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
      <FilterBar 
        category={category} setCategory={setCategory}
        funnel={funnel} setFunnel={setFunnel}
        since={since} setSince={setSince}
        until={until} setUntil={setUntil}
        onGenerate={generateReport}
        loading={loading}
      />

      {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {data && data.placements && (
        <PlacementsTable 
          data={data.placements}
          periods={data.periods}
          category={data.category}
          hasCategoryAction={data.hasCategoryAction}
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
