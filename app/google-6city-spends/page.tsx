'use client';
import React, { useState, useEffect, Suspense } from 'react';
import PlanUpload from '@/components/PlanUpload';
import Google6CityTable from '@/components/Google6CityTable';

const GOOGLE_6CITY_HEADERS = ["mumbai", "bengaluru", "chennai", "hyderabad", "gujarat"];
const DELHI_KEYWORDS = ['delhi', 'ncr'];

const GOOGLE_FUNNEL_MAP: Record<string, string> = {
  'search': 'Search Non-Brand',
  'search non-brand': 'Search Non-Brand',
  'search non-brand new': 'Search Non-Brand New',
  'search non-brand old': 'Search Non-Brand Old',
  'branded search': 'Search Brand',
  'search brand': 'Search Brand',
  'demand gen video': 'Demand Gen Video',
  'video': 'Demand Gen Video',
  'demand gen clicks': 'Demand Gen Clicks',
  'demand gen - click': 'Demand Gen Clicks',
  'demand gen': 'Demand Gen Clicks',
  'performance max': 'Performance Max',
  'shopping': 'Shopping',
  'display': 'Display'
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else { current += char; }
  }
  result.push(current);
  return result;
}

function cleanNum(val: string): number {
  if (!val || val === '-' || val.toLowerCase() === 'n/a') return 0;
  const cleaned = val.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
}

function parseGooglePlanInline(text: string): Record<string, Record<string, number>> {
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim());
  const allRows = lines.map(parseCSVLine);
  const cityPlan: Record<string, Record<string, number>> = {};
  let currentCity: string | null = null;

  for (const row of allRows) {
    const col0 = (row[0] || '').trim().replace(/\r/g, '').toLowerCase();
    const col1 = (row[1] || '').trim().replace(/\r/g, '');
    if (!col0) continue;

    if (GOOGLE_FUNNEL_MAP[col0] && currentCity) {
      const val = cleanNum(col1);
      if (!isNaN(val) && val >= 0) cityPlan[currentCity][GOOGLE_FUNNEL_MAP[col0]] = val;
      continue;
    }

    const isCity = GOOGLE_6CITY_HEADERS.some(k => col0.includes(k)) || DELHI_KEYWORDS.some(k => col0.includes(k));
    const isSpecial = col0 === 'unknown' || col0 === 'rest of india';

    if (isCity || isSpecial) {
      if (isSpecial) {
        currentCity = col0 === 'unknown' ? 'Unknown' : 'Rest';
      } else {
        currentCity = col0.includes('delhi')
          ? 'Delhi+NCR'
          : col0.includes('gujarat')
            ? 'Gujarat'
            : GOOGLE_6CITY_HEADERS.find(k => col0.includes(k))?.split(' ')
                .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Unknown';
      }
      cityPlan[currentCity] = {};
    }
  }
  return cityPlan;
}

function PageContent() {
  const [plan, setPlan] = useState<Record<string,Record<string,number>> | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const rp = localStorage.getItem('tsc_google_6city_plan');
    if (rp) setPlan(JSON.parse(rp));
  }, []);

  const handlePlanUpload = (text: string) => {
    try {
      const parsed = parseGooglePlanInline(text);
      setPlan(parsed);
      localStorage.setItem('tsc_google_6city_plan', JSON.stringify(parsed));
    } catch (err) {
      console.error(err);
      alert('Error parsing Google Plan CSV. Please ensure correct format.');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/google-6city-spends');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
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
      <div style={{ marginBottom: '24px' }}>
        {data && (
          <div style={{ background: '#1a1d27', display: 'inline-block', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#90cdf4' }}>
            {data.dates.displayMonth} | Day {data.dates.daysPassed} of {data.dates.totalDays} | {data.dates.daysRemaining} days remaining
          </div>
        )}
      </div>

      {!plan ? (
        <div style={{ background: '#1a1d27', borderRadius: '12px', padding: '32px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ marginBottom: '24px', color: '#90cdf4' }}>Upload your 6 City Google Plan CSV to get started (v2.1)</p>
          <PlanUpload label="6 City Google Plan" onLoad={handlePlanUpload} loaded={false} count={0} unit="cities" />
        </div>
      ) : (
        <>
          <div style={{ background: '#1a3a2a', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{color: '#48bb78', fontWeight: 'bold', fontSize: '14px'}}>v2.3 ({Object.keys(plan).join(', ')})</span>
            <PlanUpload label="6 City Google Plan" onLoad={handlePlanUpload} loaded={true} count={Object.keys(plan).length} unit="cities" compact />
            
            <button onClick={generateReport} disabled={loading}
              style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: '#e8733a', color: 'white', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Fetching...' : '🔄 Generate Report'}
            </button>
          </div>

          {error && <div style={{ background: '#3a1a1a', color: '#fc8181', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

          {data && (
            <Google6CityTable data={data} plan={plan} />
          )}

          {lastUpdated && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
              Last updated: {lastUpdated}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function Google6CitySpendsPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '24px' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
