'use client';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';
import PlacementsTable from '@/components/PlacementsTable';
import DaysCountBadge from '@/components/DaysCountBadge';

export default function PlacementsPage() {
  const [category, setCategory] = useState('All');
  const [funnel, setFunnel]     = useState('All');
  const [since, setSince]       = useState('');
  const [until, setUntil]       = useState('');
  
  const [roasMode, setRoasMode] = useState<'without'|'with'>('without');
  const [roasFile, setRoasFile] = useState<File | null>(null);

  const [data, setData]               = useState<any>(null);
  const [csvRoasData, setCsvRoasData] = useState<Record<string, Record<string, number>> | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const parseCsv = async (file: File): Promise<Record<string, Record<string, number>>> => {
    const text = await file.text();
    const rows = text.split('\\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
    if (rows.length < 2) throw new Error("CSV is empty or invalid.");
    
    const headers = rows[0];
    const parsedData: Record<string, Record<string, number>> = {};
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;
      const placementName = row[0];
      parsedData[placementName] = {};
      
      for (let j = 1; j < headers.length; j++) {
        if (j < row.length) {
          const val = parseFloat(row[j]);
          if (!isNaN(val)) {
            // E.g., headers[j] might be "Mar" or "2026-03"
            parsedData[placementName][headers[j]] = val;
          }
        }
      }
    }
    return parsedData;
  };

  const generateReport = async () => {
    if (roasMode === 'with' && !roasFile) {
      setError("Please upload a CSV file with Category ROAS data.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let parsedCsv = null;
      if (roasMode === 'with' && roasFile) {
        try {
          parsedCsv = await parseCsv(roasFile);
        } catch (err: any) {
          throw new Error("Failed to parse CSV: " + err.message + "\\nEnsure your CSV has Placement in the first column and Periods in subsequent columns.");
        }
      }

      const params = new URLSearchParams({ category, funnel, since, until });
      const res = await fetch(`/api/meta-placements?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to fetch data');
      
      setData(json);
      setCsvRoasData(parsedCsv);
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Placements (Meta)</h1>
        <DaysCountBadge />
      </div>
      <FilterBar 
        category={category} setCategory={setCategory}
        funnel={funnel} setFunnel={setFunnel}
        since={since} setSince={setSince}
        until={until} setUntil={setUntil}
        onGenerate={generateReport}
        loading={loading}
      />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', background: '#1a1d27', padding: '16px', borderRadius: '8px', border: '1px solid #2d3748' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 'bold' }}>ROAS Mode:</label>
          <select 
            style={{ background: '#0d1117', color: 'white', border: '1px solid #2d3748', padding: '8px 12px', borderRadius: '6px', outline: 'none' }}
            value={roasMode} 
            onChange={(e) => {
              setRoasMode(e.target.value as 'without' | 'with');
              if (e.target.value === 'without') setRoasFile(null);
            }}
          >
            <option value="without">Without Category ROAS</option>
            <option value="with">With Category ROAS (Upload CSV)</option>
          </select>
        </div>

        {roasMode === 'with' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ color: '#a0aec0', fontSize: '14px' }}>Upload CSV:</label>
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setRoasFile(e.target.files?.[0] || null)}
              style={{ color: 'white', fontSize: '14px' }}
            />
          </div>
        )}
      </div>

      {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {data && data.placements && (
        <PlacementsTable 
          data={data.placements}
          periods={data.periods}
          category={data.category}
          hasCategoryAction={data.hasCategoryAction}
          csvRoasData={csvRoasData}
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
