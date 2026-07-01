'use client';
import React, { useState, useEffect } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import { getDefaultMonths } from '@/lib/dateRangeUtils';

const CATEGORIES = ['All', 'Mattress', 'Chair', 'Sofa', 'Desk', 'Elite', 'Foot Massager', 'Accessories', 'Bed'];

const fmtINR = (val: number) => '₹' + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal = (val: number) => Math.round(Number(val) || 0).toLocaleString('en-IN');
const fmtFloat = (val: number) => (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPctStr = (val: number) => {
  if (!isFinite(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return prefix + (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

const renderVs = (val: number) => {
  if (!isFinite(val)) return <span>0.00%</span>;
  const color = val > 0 ? '#48bb78' : val < 0 ? '#fc8181' : 'inherit';
  return <span style={{ color }}>{fmtPctStr(val)}</span>;
};

export default function FunnelLevelPerformance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [badgeInfo, setBadgeInfo] = useState<{ monthName: string, daysPassed: number, daysTotal: number, daysRemaining: number } | null>(null);

  useEffect(() => {
    const istString2 = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today2 = new Date(istString2);
    const yesterday2 = new Date(today2.getFullYear(), today2.getMonth(), today2.getDate() - 1);
    const mName = yesterday2.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dPassed = yesterday2.getDate();
    const dTotal = new Date(yesterday2.getFullYear(), yesterday2.getMonth() + 1, 0).getDate();
    setBadgeInfo({ monthName: mName, daysPassed: dPassed, daysTotal: dTotal, daysRemaining: dTotal - dPassed });
  }, []);
  


  const [category, setCategory] = useState('All');
  
  const defMonths = getDefaultMonths();
  const [startDate, setStartDate] = useState(defMonths[0].startDate);
  const [endDate, setEndDate] = useState(defMonths[defMonths.length - 1].endDate);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ category, startDate, endDate });
      const res = await fetch(`/api/funnel-level-performance?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.campaigns && json.monthLabels) {
        const lastM = json.monthLabels[json.monthLabels.length - 1];
        json.campaigns.sort((a: any, b: any) => (b[lastM]?.spend || 0) - (a[lastM]?.spend || 0));
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data && !loading) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = () => {
    if (!data) return;
    
    const mLabels = data.monthLabels || [];

    let headerM = '';
    mLabels.forEach((m: string) => headerM += `Amount Spent ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Category ROAS ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Overall ROAS ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `CPM ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `CPW ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Walk-in (Absolute) ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `CTR ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `CPC ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `LC to LP% ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `LC ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `LP ${m.toUpperCase()},`);
    mLabels.forEach((m: string) => headerM += `Impressions ${m.toUpperCase()},`);

    const headers = [
      'Funnel',
      headerM.slice(0, -1)
    ];

    const rows = data.campaigns.map((c: any) => {
      let row = `"${c.name}",`;
      mLabels.forEach((m: string) => row += `${c[m].spend},`);
      mLabels.forEach((m: string) => row += `${c[m].categoryRoas === c[m].overallRoas ? '' : c[m].categoryRoas},`);
      mLabels.forEach((m: string) => row += `${c[m].overallRoas},`);
      mLabels.forEach((m: string) => row += `${c[m].cpm},`);
      mLabels.forEach((m: string) => row += `${c[m].cpw},`);
      mLabels.forEach((m: string) => row += `${c[m].walkin},`);
      mLabels.forEach((m: string) => row += `${c[m].ctr},`);
      mLabels.forEach((m: string) => row += `${c[m].cpc},`);
      mLabels.forEach((m: string) => row += `${c[m].lcToLp},`);
      mLabels.forEach((m: string) => row += `${c[m].lc},`);
      mLabels.forEach((m: string) => row += `${c[m].lp},`);
      mLabels.forEach((m: string) => row += `${c[m].impressions},`);
      return row.slice(0, -1);
    });

    const csvContent = [
      headers.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Funnel_Level_Performance_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f1117', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Funnel Level Performance (Meta)</h1>
          {badgeInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
              <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348' }}>
                📅 {badgeInfo.monthName} | Day {badgeInfo.daysPassed} of {badgeInfo.daysTotal} | {badgeInfo.daysRemaining} days remaining
              </span>
            </div>
          )}
        </div>
        <button 
          onClick={exportCSV}
          style={{ backgroundColor: '#2d3748', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          📥 Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#1f2333', color: '#fff', border: '1px solid #2d3348' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <DateRangePicker 
          defaultStartDate={startDate}
          defaultEndDate={endDate}
          onApply={(start, end) => {
            const yday = new Date();
            yday.setDate(yday.getDate() - 1);
            
            const startD = new Date(start);
            let endD = new Date(end);
            endD = new Date(endD.getFullYear(), endD.getMonth() + 1, 0); // End of month
            
            if (endD > yday) {
              endD = yday;
            }
            
            const fmt = (d: Date) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            };
            
            setStartDate(fmt(startD));
            setEndDate(fmt(endD));
          }}
          onReset={() => {
            const def = getDefaultMonths();
            setStartDate(def[0].startDate);
            setEndDate(def[def.length - 1].endDate);
          }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            onClick={fetchData} 
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '4px', 
              background: '#3182ce', 
              color: '#fff', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              height: '38px',
              fontWeight: 'bold',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2b6cb0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3182ce'}
          >
            {loading ? 'Generating...' : 'Generate Output'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px' }}>{error}</div>}

      {loading && !data ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #2d3348', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
            <thead style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
              <tr>
                <th rowSpan={2} style={{ background: '#e8733a', color: '#fff', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'sticky', left: 0, zIndex: 10 }}>Funnel</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Amount Spent</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Category ROAS</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Overall ROAS</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPM</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPW</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Walk-in (Absolute)</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CTR</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>CPC</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LC to LP%</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LC</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>LP</th>
                <th colSpan={data?.monthLabels?.length || 4} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Impressions</th>
              </tr>
              <tr>
                {/* 12 Metric blocks */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <React.Fragment key={i}>
                    {data?.monthLabels?.map((m: string) => (
                      <th key={`${i}-${m}`} style={{ background: '#e8733a', color: '#fff', padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{m}</th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.campaigns.map((c: any, i: number) => {
                const bg = i % 2 === 0 ? '#1a1d27' : '#1f2333';
                return (
                  <tr key={c.name} style={{ background: bg, borderBottom: '1px solid #2d3348' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', background: bg, position: 'sticky', left: 0 }}>{c.name}</td>
                    
                    {/* Spend */}
                    {data.monthLabels?.map((m: string) => <td key={`sp-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(c[m]?.spend)}</td>)}
                    
                    {/* Category ROAS */}
                    {data.monthLabels?.map((m: string) => <td key={`croas-${m}`} style={{ padding: '12px 8px' }}>{c[m]?.categoryRoas === c[m]?.overallRoas ? '' : fmtFloat(c[m]?.categoryRoas)}</td>)}

                    {/* Overall ROAS */}
                    {data.monthLabels?.map((m: string) => <td key={`oroas-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(c[m]?.overallRoas)}</td>)}

                    {/* CPM */}
                    {data.monthLabels?.map((m: string) => <td key={`cpm-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(c[m]?.cpm)}</td>)}

                    {/* CPW */}
                    {data.monthLabels?.map((m: string) => <td key={`cpw-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(c[m]?.cpw)}</td>)}

                    {/* Walk-in */}
                    {data.monthLabels?.map((m: string) => <td key={`wi-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(c[m]?.walkin)}</td>)}

                    {/* CTR */}
                    {data.monthLabels?.map((m: string) => <td key={`ctr-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(c[m]?.ctr)}%</td>)}

                    {/* CPC */}
                    {data.monthLabels?.map((m: string) => <td key={`cpc-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(c[m]?.cpc)}</td>)}

                    {/* LC to LP% */}
                    {data.monthLabels?.map((m: string) => <td key={`lclp-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(c[m]?.lcToLp)}%</td>)}

                    {/* LC */}
                    {data.monthLabels?.map((m: string) => <td key={`lc-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(c[m]?.lc)}</td>)}

                    {/* LP */}
                    {data.monthLabels?.map((m: string) => <td key={`lp-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(c[m]?.lp)}</td>)}

                    {/* Impressions */}
                    {data.monthLabels?.map((m: string) => <td key={`imp-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(c[m]?.impressions)}</td>)}
                  </tr>
                );
              })}
            </tbody>
            {data?.total && (
              <tfoot>
                <tr style={{ background: '#111', fontWeight: 'bold', borderTop: '2px solid #2d3348', position: 'sticky', bottom: 0 }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #2d3348', position: 'sticky', left: 0, background: '#111' }}>Total</td>
                  
                  {/* Spend */}
                  {data.monthLabels?.map((m: string) => <td key={`tsp-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(data.total[m]?.spend)}</td>)}
                  
                  {/* Category ROAS */}
                  {data.monthLabels?.map((m: string) => <td key={`tcroas-${m}`} style={{ padding: '12px 8px' }}>{data.total[m]?.categoryRoas === data.total[m]?.overallRoas ? '' : fmtFloat(data.total[m]?.categoryRoas)}</td>)}

                  {/* Overall ROAS */}
                  {data.monthLabels?.map((m: string) => <td key={`toroas-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(data.total[m]?.overallRoas)}</td>)}

                  {/* CPM */}
                  {data.monthLabels?.map((m: string) => <td key={`tcpm-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(data.total[m]?.cpm)}</td>)}

                  {/* CPW */}
                  {data.monthLabels?.map((m: string) => <td key={`tcpw-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(data.total[m]?.cpw)}</td>)}

                  {/* Walk-in */}
                  {data.monthLabels?.map((m: string) => <td key={`twi-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(data.total[m]?.walkin)}</td>)}

                  {/* CTR */}
                  {data.monthLabels?.map((m: string) => <td key={`tctr-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(data.total[m]?.ctr)}%</td>)}

                  {/* CPC */}
                  {data.monthLabels?.map((m: string) => <td key={`tcpc-${m}`} style={{ padding: '12px 8px' }}>{fmtINR(data.total[m]?.cpc)}</td>)}

                  {/* LC to LP% */}
                  {data.monthLabels?.map((m: string) => <td key={`tlclp-${m}`} style={{ padding: '12px 8px' }}>{fmtFloat(data.total[m]?.lcToLp)}%</td>)}

                  {/* LC */}
                  {data.monthLabels?.map((m: string) => <td key={`tlc-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(data.total[m]?.lc)}</td>)}

                  {/* LP */}
                  {data.monthLabels?.map((m: string) => <td key={`tlp-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(data.total[m]?.lp)}</td>)}

                  {/* Impressions */}
                  {data.monthLabels?.map((m: string) => <td key={`timp-${m}`} style={{ padding: '12px 8px' }}>{fmtVal(data.total[m]?.impressions)}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
