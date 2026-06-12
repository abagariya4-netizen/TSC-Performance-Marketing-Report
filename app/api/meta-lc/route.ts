import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { classifyFunnel } from '@/lib/metricUtils';

function groupRows(rows: any[], cat: string) {
  const result: Record<string, Record<string, {
    spend: number;
    link_clicks: number;
    landing_page_views: number;
  }>> = { TOP: {}, MID: {}, BOTTOM: {}, GROWTH: {} };

  // Campaign name rules
  const CAMPAIGN_RULES: Record<string, { contains?: string; excludes: string[] }> = {
    'All':          { excludes: ['boost','growth'] },
    'Mattress':     { contains: 'mat', excludes: ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai','boost','growth'] },
    'Chair':        { contains: 'chair',  excludes: ['boost','growth'] },
    'Sofa':         { contains: 'sofa',   excludes: ['boost','growth'] },
    'Desk':         { contains: 'desk',   excludes: ['boost','growth'] },
    'Elite':        { contains: 'elite',  excludes: ['boost','growth'] },
    'Foot Massager':{ contains: 'foot',   excludes: ['boost','growth'] },
    'Accessories':  { contains: 'acce',   excludes: ['boost','growth'] },
    'Bed':          { contains: 'bed',    excludes: ['boost','growth'] },
  };

  // Adset name exclusion rules (no "contains" check, only exclusions)
  const ADSET_EXCLUDES: Record<string, string[]> = {
    'All':          ['boost','growth'],
    'Mattress':     ['sofa','desk','chair','boost','growth'],
    'Chair':        ['mattress','mat','desk','sofa','boost','growth'],
    'Desk':         ['mattress','mat','sofa','chair','boost','growth'],
    'Sofa':         ['boost','growth'],
    'Elite':        ['boost','growth'],
    'Foot Massager':['boost','growth'],
    'Accessories':  ['boost','growth'],
    'Bed':          ['boost','growth'],
  };

  function classifyFunnel(cn: string): string | null {
    if (cn.includes('growth'))                        return 'GROWTH';
    if (cn.includes('bot') && !cn.includes('growth')) return 'BOTTOM';
    if (cn.includes('mid') && !cn.includes('growth')) return 'MID';
    if (!cn.includes('mid') && !cn.includes('bot'))   return 'TOP';
    return null;
  }

  rows.forEach(row => {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name    || '').toLowerCase();

    // Step 1: Campaign name filter
    const campRule = CAMPAIGN_RULES[cat];
    if (!campRule) return;
    if (campRule.contains && !cn.includes(campRule.contains)) return;
    for (const exc of campRule.excludes) {
      if (cn.includes(exc)) return;
    }

    // Step 2: Adset name exclusion filter
    const adsetExcludes = ADSET_EXCLUDES[cat] || ['boost','growth'];
    for (const exc of adsetExcludes) {
      if (an.includes(exc)) return;
    }

    // Step 3: Classify funnel by campaign name
    const funnel = classifyFunnel(cn);
    if (!funnel) return;

    // Step 4: Accumulate
    const period = row.date_start;
    const spend  = Math.round(parseFloat(row.spend || '0'));
    
    let lc = 0;
    let lp = 0;

    if (row.actions && Array.isArray(row.actions)) {
      row.actions.forEach((a: any) => {
        if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
        if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
      });
    }

    if (!result[funnel]) result[funnel] = {};
    if (!result[funnel][period]) {
      result[funnel][period] = { spend: 0, link_clicks: 0, landing_page_views: 0 };
    }
    result[funnel][period].spend               += spend;
    result[funnel][period].link_clicks         += lc;
    result[funnel][period].landing_page_views  += lp;
  });

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'All';
    const since    = searchParams.get('since')    || '';
    const until    = searchParams.get('until')    || '';

    const token     = process.env.META_ACCESS_TOKEN!;
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const BASE      = 'https://graph.facebook.com/v19.0';

    // Fetch month-level data
    const monthUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,actions`
      + `&time_increment=monthly`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      + `&level=adset&limit=500`
      + `&access_token=${token}`;

    // For day-level data, fetch only the current month (month of 'until')
    const untilDate = until ? new Date(until) : new Date();
    const daySinceStr = `${untilDate.getFullYear()}-${String(untilDate.getMonth() + 1).padStart(2, '0')}-01`;

    const dayUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,actions`
      + `&time_increment=1`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since: daySinceStr, until }))}`
      + `&level=adset&limit=500`
      + `&access_token=${token}`;

    const monthRows = await fetchAllPages(monthUrl);
    const dayRows   = await fetchAllPages(dayUrl);

    const monthlyData = groupRows(monthRows, category);
    const dailyData   = groupRows(dayRows, category);

    // Extract sorted periods
    const monthPeriods = new Set<string>();
    Object.values(monthlyData).forEach(funnelData => {
      Object.keys(funnelData).forEach(p => monthPeriods.add(p));
    });

    const dayPeriods = new Set<string>();
    Object.values(dailyData).forEach(funnelData => {
      Object.keys(funnelData).forEach(p => dayPeriods.add(p));
    });

    return NextResponse.json({
      monthly: monthlyData,
      daily:   dailyData,
      periods: {
        months: Array.from(monthPeriods).sort(),
        days:   Array.from(dayPeriods).sort()
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
