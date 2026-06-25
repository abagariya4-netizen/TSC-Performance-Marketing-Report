'use client';
import React, { useState, useEffect } from 'react';
import PlanUpload from '@/components/PlanUpload';

const PLAN_STORAGE_KEY = 'tsc_six_city_filtered_plan';

const CATEGORIES = ['All', 'Mattress', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];
const REGIONS = [
  'All', 'Maharashtra', 'Karnataka', 'Telangana', 'Delhi',
  'Tamil Nadu', 'Uttar Pradesh', 'Gujarat', 'West Bengal',
  'Andhra Pradesh', 'Rajasthan', 'Haryana', 'Kerala',
  'Punjab region', 'Madhya Pradesh', 'Bihar', 'Odisha',
  'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand',
  'Jammu and Kashmir', 'Himachal Pradesh', 'Chandigarh',
  'Goa', 'Puducherry', 'Unknown'
];

function SearchableRegionDropdown({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    if (isOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  let filtered = REGIONS.filter(r => r === 'All' || r.toLowerCase().includes(search.toLowerCase()));
  if (!filtered.includes('All')) {
    filtered = ['All', ...filtered];
  }

  return (
    <div style={{ position: 'relative', minWidth: '200px' }} onClick={e => e.stopPropagation()}>
      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>Region</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#1A2336', color: '#fff', border: '1px solid #2D3A57', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '35px', boxSizing: 'border-box' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <span style={{ fontSize: '10px', color: '#a0aec0', marginLeft: '8px' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#1A2336', border: '1px solid #2D3A57', borderRadius: '4px', zIndex: 50, maxHeight: '300px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #2D3A57' }}>
            <input 
              type="text" 
              placeholder="Search region..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', backgroundColor: '#0D1220', color: '#fff', border: '1px solid #2D3A57', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(r => (
              <div 
                key={r}
                onClick={() => { onChange(r); setIsOpen(false); setSearch(''); }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#243050'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                style={{ padding: '8px 12px', cursor: 'pointer', color: value === r ? '#e8733a' : '#fff', fontWeight: value === r ? 'bold' : 'normal', transition: 'background-color 0.2s' }}
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SixCityFilteredPage() {
  const [category, setCategory] = useState('All');
  const [region, setRegion] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planMap, setPlanMap] = useState<Record<string, Record<string, number>>>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Set default dates
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate() - 1).padStart(2, '0');
    const firstDay = `${y}-${m}-01`;
    const yday = `${y}-${m}-${d}`;
    setStartDate(firstDay);
    setEndDate(yday);

    const saved = localStorage.getItem(PLAN_STORAGE_KEY);
    if (saved) {
      try {
        setPlanMap(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handlePlanUpload = (csvText: string) => {
    // CSV format: Region, Funnel, Plan
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    const newPlan: Record<string, Record<string, number>> = {};
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 3) {
        const r = parts[0].trim();
        const f = parts[1].trim();
        const plan = parseFloat(parts[2].replace(/[^0-9.-]/g, '')) || 0;
        if (!newPlan[r]) newPlan[r] = {};
        newPlan[r][f] = plan;
      }
    }
    setPlanMap(newPlan);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(newPlan));
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams();
      params.append('category', category);
      params.append('region', region);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/six-city-meta-filtered?${params.toString()}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (num: number, dec: number = 0) => {
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec });
  };
  const fmtPct = (num: number) => num.toFixed(2) + '%';

  const renderContent = () => {
    if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading data...</div>;
    if (error) return <div style={{ color: '#fc8181', padding: '2rem' }}>Error: {error}</div>;
    if (!data) return null;

    const { funnels, region: dataRegion, daysTotal, daysPassed, daysRemaining } = data;
    const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const regionPlan = planMap[dataRegion] || {};

    const rows = funnels.map((f: any) => {
      const plan = regionPlan[f.funnel] || 0;
      const estSpends = f.mtd + (f.yesterday * daysRemaining);
      let diffPct = 0;
      if (plan > 0 && daysTotal > 0 && daysPassed > 0) {
        diffPct = ((f.mtd / (plan * daysPassed / daysTotal)) - 1) * 100;
      }
      const estMinusPlan = estSpends - plan;
      const isOver = estSpends >= plan;

      return {
        funnel: f.funnel,
        plan,
        mtd: f.mtd,
        yesterday: f.yesterday,
        estSpends,
        diffPct,
        estMinusPlan,
        isOver
      };
    });

    const totals = rows.reduce((acc: any, r: any) => {
      acc.plan += r.plan;
      acc.mtd += r.mtd;
      acc.yesterday += r.yesterday;
      acc.estSpends += r.estSpends;
      acc.estMinusPlan += r.estMinusPlan;
      return acc;
    }, { plan: 0, mtd: 0, yesterday: 0, estSpends: 0, estMinusPlan: 0 });

    if (totals.plan > 0 && daysTotal > 0 && daysPassed > 0) {
      totals.diffPct = ((totals.mtd / (totals.plan * daysPassed / daysTotal)) - 1) * 100;
    } else {
      totals.diffPct = 0;
    }
    totals.isOver = totals.estSpends >= totals.plan;

    const exportCSV = () => {
      setIsExporting(true);
      try {
        const headers = ['Funnel', 'Overall (Plan)', 'MTD', 'Yesterday', 'Est. Spends', 'Difference %', 'Est - Plan', 'Over/Under'];
        const csvRows = [headers.join(',')];
        for (const r of rows) {
          csvRows.push(`"${r.funnel}",${r.plan},${r.mtd},${r.yesterday},${r.estSpends},${r.diffPct.toFixed(2)}%,${r.estMinusPlan},${r.isOver ? 'Over' : 'Under'}`);
        }
        csvRows.push(`"Total",${totals.plan},${totals.mtd},${totals.yesterday},${totals.estSpends},${totals.diffPct.toFixed(2)}%,${totals.estMinusPlan},${totals.isOver ? 'Over' : 'Under'}`);
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `six-city-filtered-meta-${dataRegion}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } finally {
        setIsExporting(false);
      }
    };

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
              📅 {monthName} | Day {daysPassed} of {daysTotal} | {daysRemaining} days remaining
            </span>
          </div>
          <button 
            onClick={exportCSV}
            disabled={isExporting}
            style={{ 
              backgroundColor: '#2d3748', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            {isExporting ? 'Exporting...' : '📥 Export CSV'}
          </button>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2d3348' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <thead style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
              <tr style={{ backgroundColor: '#e8733a', color: '#fff' }}>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Funnel</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Overall (Plan)</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>MTD</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Yesterday</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Est. Spends</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Difference %</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Est - Plan</th>
                <th style={{ background: '#e8733a', color: '#fff', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Over/Under</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => (
                <tr key={r.funnel} style={{ backgroundColor: idx % 2 === 0 ? '#1a1d27' : '#1f2333', borderBottom: '1px solid #2d3348' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', background: idx % 2 === 0 ? '#1a1d27' : '#1f2333', position: 'sticky', left: 0 }}>{r.funnel}</td>
                  <td style={{ padding: '12px 8px' }}>{fmt(r.plan)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmt(r.mtd)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmt(r.yesterday)}</td>
                  <td style={{ padding: '12px 8px' }}>{fmt(r.estSpends)}</td>
                  <td style={{ padding: '12px 8px', color: r.diffPct > 0 ? '#48bb78' : '#fc8181' }}>{fmtPct(r.diffPct)}</td>
                  <td style={{ padding: '12px 8px', color: r.estMinusPlan > 0 ? '#fc8181' : '#48bb78' }}>
                    {r.estMinusPlan > 0 ? '+' : ''}{fmt(r.estMinusPlan)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #2d3348' }}>
                    <span style={{ 
                      backgroundColor: r.isOver ? 'rgba(72,187,120,0.2)' : 'rgba(252,129,129,0.2)',
                      color: r.isOver ? '#48bb78' : '#fc8181',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {r.isOver ? 'Over' : 'Under'}
                    </span>
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #2d3348', position: 'sticky', bottom: 0 }}>
                <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                <td style={{ padding: '12px 8px' }}>{fmt(totals.plan)}</td>
                <td style={{ padding: '12px 8px' }}>{fmt(totals.mtd)}</td>
                <td style={{ padding: '12px 8px' }}>{fmt(totals.yesterday)}</td>
                <td style={{ padding: '12px 8px' }}>{fmt(totals.estSpends)}</td>
                <td style={{ padding: '12px 8px', color: totals.diffPct > 0 ? '#48bb78' : '#fc8181' }}>{fmtPct(totals.diffPct)}</td>
                <td style={{ padding: '12px 8px', color: totals.estMinusPlan > 0 ? '#fc8181' : '#48bb78' }}>
                  {totals.estMinusPlan > 0 ? '+' : ''}{fmt(totals.estMinusPlan)}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #2d3348' }}>
                  <span style={{ 
                    backgroundColor: totals.isOver ? 'rgba(72,187,120,0.2)' : 'rgba(252,129,129,0.2)',
                    color: totals.isOver ? '#48bb78' : '#fc8181',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {totals.isOver ? 'Over' : 'Under'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>6 City Filtered (Meta)</h1>
        <PlanUpload 
          label="Change Plan" 
          onLoad={handlePlanUpload} 
          loaded={Object.keys(planMap).length > 0} 
          count={Object.keys(planMap).length} 
          unit="regions" 
          compact
        />
      </div>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: '#1a1d27', padding: '16px', borderRadius: '8px', border: '1px solid #2d3348' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#2d3748', color: '#fff', border: '1px solid #4a5568' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <SearchableRegionDropdown value={region} onChange={setRegion} />
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#2d3748', color: '#fff', border: '1px solid #4a5568' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#a0aec0' }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#2d3748', color: '#fff', border: '1px solid #4a5568' }} />
        </div>
        <button 
          onClick={fetchReport}
          disabled={loading}
          style={{ 
            backgroundColor: '#e8733a', 
            color: 'white', 
            border: 'none', 
            padding: '8px 24px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            height: '38px'
          }}
        >
          {loading ? 'Fetching...' : 'Generate Report'}
        </button>
      </div>

      {renderContent()}
    </div>
  );
}
