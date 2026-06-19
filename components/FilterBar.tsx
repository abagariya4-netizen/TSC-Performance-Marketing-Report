import React from 'react';
import { getDefaultDateRange } from '@/lib/metricUtils';

export const CATEGORIES = [
  'All', 'Mattress', 'Sofa', 'Desk', 'Chair', 'Elite', 
  'Foot Massager', 'Accessories', 'Bed'
];

interface FilterBarProps {
  category: string;
  setCategory: (c: string) => void;
  funnel?: string;
  setFunnel?: (f: string) => void;
  since: string;
  setSince: (s: string) => void;
  until: string;
  setUntil: (u: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function FilterBar({
  category, setCategory,
  funnel, setFunnel,
  since, setSince,
  until, setUntil,
  onGenerate, loading
}: FilterBarProps) {
  
  // Set defaults if empty
  React.useEffect(() => {
    if (!since || !until) {
      const def = getDefaultDateRange();
      setSince(def.since);
      setUntil(def.until);
    }
  }, [since, until, setSince, setUntil]);

  return (
    <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px', padding: '16px 20px' }}>
      
      <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {funnel !== undefined && setFunnel && (
        <select className="input-field" value={funnel} onChange={(e) => setFunnel(e.target.value)}>
          <option value="All">All Funnels</option>
          <option value="TOP">Top</option>
          <option value="MID">Mid</option>
          <option value="BOTTOM">Bottom</option>
          <option value="GROUP">Group</option>
          <option value="GROWTH">Growth</option>
        </select>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>From:</label>
        <input type="date" className="input-field" style={{ border: 'none', background: 'transparent', padding: 0 }} value={since} onChange={e => setSince(e.target.value)} />
        <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }}></div>
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>To:</label>
        <input type="date" className="input-field" style={{ border: 'none', background: 'transparent', padding: 0 }} value={until} onChange={e => setUntil(e.target.value)} />
      </div>

      <button 
        onClick={onGenerate} 
        disabled={loading}
        className="btn-primary"
        style={{ marginLeft: 'auto' }}>
        {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
      </button>
    </div>
  );
}
