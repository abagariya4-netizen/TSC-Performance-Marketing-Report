import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';

export const dynamic = 'force-dynamic';

const ACCOUNT_ID = 'act_2240079932900749';
const BASE_URL = 'https://graph.facebook.com/v19.0';
const WALKIN_ACTION = 'cl_walk_in';

function classifyFunnel(campaignName: string): string {
  const lower = campaignName.toLowerCase();
  if (lower.includes('growth')) return 'Growth';
  if (lower.includes('bot')) return 'Bottom';
  if (lower.includes('mid')) return 'Mid';
  return 'Top';
}

import { matchesCategoryForMetrics } from '@/lib/metricUtils';



export async function GET(req: NextRequest) {
  const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'All';
  const dayType = searchParams.get('dayType') || 'All';
  let startDate = searchParams.get('startDate');
  let endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    startDate = '2026-06-01';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    endDate = yesterday.toISOString().split('T')[0];
  }

  const periods = [
    { key: 'mar', since: '2026-03-01', until: '2026-03-31' },
    { key: 'apr', since: '2026-04-01', until: '2026-04-30' },
    { key: 'may', since: '2026-05-01', until: '2026-05-31' },
    { key: 'jun', since: startDate, until: endDate },
  ];

  try {
    const funnelsData: Record<string, any> = {
      Top: { name: 'Top', mar: { spend: 0, walkin: 0 }, apr: { spend: 0, walkin: 0 }, may: { spend: 0, walkin: 0 }, jun: { spend: 0, walkin: 0 } },
      Mid: { name: 'Mid', mar: { spend: 0, walkin: 0 }, apr: { spend: 0, walkin: 0 }, may: { spend: 0, walkin: 0 }, jun: { spend: 0, walkin: 0 } },
      Bottom: { name: 'Bottom', mar: { spend: 0, walkin: 0 }, apr: { spend: 0, walkin: 0 }, may: { spend: 0, walkin: 0 }, jun: { spend: 0, walkin: 0 } },
      Growth: { name: 'Growth', mar: { spend: 0, walkin: 0 }, apr: { spend: 0, walkin: 0 }, may: { spend: 0, walkin: 0 }, jun: { spend: 0, walkin: 0 } }
    };

    const fetchPeriod = async (p: any) => {
      const timeRangeStr = encodeURIComponent(JSON.stringify({ since: p.since, until: p.until }));
      let url = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,actions,action_values,results,cost_per_result&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
      
      if (dayType !== 'All') {
        url += '&time_increment=1';
      }

      const data = await fetchAllPages(url);
      
      for (const row of data) {
        if (dayType !== 'All') {
          if (!row.date_start) continue;
          const dt = new Date(row.date_start);
          const dayOfWeek = dt.getUTCDay(); // 0 is Sunday, 6 is Saturday
          if (dayType === 'Weekday') {
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
          } else if (dayType === 'Weekend') {
            if (dayOfWeek !== 0 && dayOfWeek !== 6) continue;
          }
        }

        const cName = row.campaign_name || '';
        const aName = row.adset_name || '';

        const funnel = classifyFunnel(cName);

        const cn = cName.toLowerCase();
        const an = aName.toLowerCase();



        if (!matchesCategoryForMetrics(cName, aName, category)) continue;

        const node = funnelsData[funnel];
        if (!node) continue;

        const m = node[p.key];
        m.spend += parseFloat(row.spend || '0');

        const actions = row.actions || [];
        let walkins = 0;
        
        // METHOD 1 — Extract from results array (primary):
        const resultsArr = Array.isArray(row.results) 
          ? row.results
          : Array.isArray(row.results?.value) 
          ? row.results.value 
          : [];

        const wi = resultsArr.find(
          (x: any) => x.indicator && x.indicator.includes('cl_walk_in')
        );
        walkins = wi 
          ? +(wi.values?.[0]?.value || wi.value || 0) 
          : 0;

        // METHOD 2 — Fallback to actions array:
        if (!walkins && Array.isArray(row.actions)) {
          const action = row.actions.find(
            (x: any) => x.action_type && 
            x.action_type.includes('cl_walk_in')
          );
          if (action) walkins = parseFloat(action.value || '0');
        }

        // METHOD 3 — Final fallback exact match:
        if (!walkins && Array.isArray(row.actions)) {
          const action = row.actions.find(
            (x: any) => x.action_type === 
            'offsite_conversion.fb_pixel_custom.cl_walk_in'
          );
          if (action) walkins = parseFloat(action.value || '0');
        }

        m.walkin += walkins;
      }
    };

    await Promise.all(periods.map(fetchPeriod));

    const totalObj = {
      mar: { spend: 0, walkin: 0, cpw: 0 },
      apr: { spend: 0, walkin: 0, cpw: 0 },
      may: { spend: 0, walkin: 0, cpw: 0 },
      jun: { spend: 0, walkin: 0, cpw: 0 }
    };

    const funnelOrder = ['Top', 'Mid', 'Bottom', 'Growth'];
    const finalFunnels = [];

    for (const f of funnelOrder) {
      const data = funnelsData[f];
      for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
        data[m].cpw = data[m].walkin > 0 ? data[m].spend / data[m].walkin : 0;
        
        totalObj[m].spend += data[m].spend;
        totalObj[m].walkin += data[m].walkin;
      }
      finalFunnels.push({ funnel: f, ...data });
    }

    for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
      totalObj[m].cpw = totalObj[m].walkin > 0 ? totalObj[m].spend / totalObj[m].walkin : 0;
    }

    return NextResponse.json({
      funnels: finalFunnels,
      total: totalObj
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
