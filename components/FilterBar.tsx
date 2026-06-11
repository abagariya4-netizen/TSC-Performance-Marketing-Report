import React from 'react';
import { fmtDate } from '@/lib/dateUtils';

export const CATEGORIES = [
  'All', 'Mattress', 'Sofa', 'Desk', 'Chair', 'Elite', 
  'Foot Massager', 'Accessories', 'Bed'
];

export const FUNNELS = [
  'All', 'Top', 'Mid', 'Bottom', 'Growth'
];

interface FilterBarProps {
  category: string;
  setCategory: (c: string) => void;
  funnel: string;
  setFunnel: (f: string) => void;
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
      const today = new Date();
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setSince(fmtDate(startOfMonth));
      setUntil(fmtDate(yesterday));
    }
  }, [since, until, setSince, setUntil]);

  const selectStyle = {
    background: '#1a1d27', color: 'white', border: '1px solid #2d3748', 
    padding: '8px 12px', borderRadius: '6px', outline: 'none'
  };

  const inputStyle = {
    ...selectStyle,
    colorScheme: 'dark'
  };

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
      
      <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select style={selectStyle} value={funnel} onChange={(e) => setFunnel(e.target.value)}>
        {FUNNELS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1d27', padding: '4px 12px', borderRadius: '6px', border: '1px solid #2d3748' }}>
        <label style={{ color: '#a0aec0', fontSize: '14px' }}>From:</label>
        <input type="date" style={{ ...inputStyle, border: 'none', background: 'transparent' }} value={since} onChange={e => setSince(e.target.value)} />
        <label style={{ color: '#a0aec0', fontSize: '14px' }}>To:</label>
        <input type="date" style={{ ...inputStyle, border: 'none', background: 'transparent' }} value={until} onChange={e => setUntil(e.target.value)} />
      </div>

      <button 
        onClick={onGenerate} 
        disabled={loading}
        style={{ 
          padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: '#e8733a', color: 'white', fontWeight: 700, opacity: loading ? 0.7 : 1,
          marginLeft: 'auto'
        }}>
        {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
      </button>
    </div>
  );
}
