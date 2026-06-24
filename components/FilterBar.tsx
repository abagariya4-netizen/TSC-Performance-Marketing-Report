import React from 'react';
import { getDefaultDateRange } from '@/lib/metricUtils';
import DateRangePicker from '@/components/DateRangePicker';
import { getDefaultMonths } from '@/lib/dateRangeUtils';

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

      <DateRangePicker 
        onApply={(start, end) => {
          setSince(new Date(start).toISOString().split('T')[0]);
          setUntil(new Date(end).toISOString().split('T')[0]);
        }}
        onReset={() => {
          const def = getDefaultMonths();
          setSince(def[0].startDate);
          setUntil(def[def.length - 1].endDate);
        }}
      />

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
