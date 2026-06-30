import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { matchesCategoryForMetrics } from '@/lib/metricUtils';



function classifyFunnel(cn: string): string | null {
  if (cn.includes('growth')) return 'GROWTH';
  if (cn.includes('group')) return null;
  if (cn.includes('rnf')) return null;

  if (cn.includes('bot')) return 'BOTTOM';
  if (cn.includes('mid')) return 'MID';
  if (!cn.includes('mid') && !cn.includes('bot')) return 'TOP';
  return null;
}

function groupRows(rows: any[], cat: string) {
  const result: Record<string, Record<string, {
    spend: number;
    link_clicks: number;
    landing_page_views: number;
  }>> = { TOP: {}, MID: {}, BOTTOM: {}, GROWTH: {} };

  rows.forEach(row => {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name || '').toLowerCase();

    if (cat === 'All') {
      if (cn.includes('dhoni') && !an.includes('mat')) return;
      if (cn.includes('boost') || cn.includes('growth')) return;
      if (an.includes('boost') || an.includes('growth')) return;
    } else {
      if (!matchesCategoryForMetrics(cn, an, cat)) return;
    }

    // Step 3: Classify funnel by campaign name
    const funnel = classifyFunnel(cn);
    if (!funnel) return;

    // Step 4: Accumulate
    const period = row.date_start;
    const spend = Math.round(parseFloat(row.spend || '0'));

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
    result[funnel][period].spend += spend;
    result[funnel][period].link_clicks += lc;
    result[funnel][period].landing_page_views += lp;
  });

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'All';
    const since = searchParams.get('since') || '';
    const until = searchParams.get('until') || '';
    const debug = searchParams.get('debug') === 'true';

    const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const BASE = 'https://graph.facebook.com/v19.0';

    // Fetch month-level data
    const monthUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,actions`
      + `&time_increment=monthly`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      + `&level=adset&limit=500`
      + `&access_token=${token}`;

    // For day-level data, fetch rolling last 30 days window ending yesterday
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 29);

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const daySinceStr = fmt(startDay);
    const dayUntilStr = fmt(yesterday);

    const dayUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,actions`
      + `&time_increment=1`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since: daySinceStr, until: dayUntilStr }))}`
      + `&level=adset&limit=500`
      + `&access_token=${token}`;

    let monthRows: any[];
    let dayRows: any[] = [];

    if (debug) {
      monthRows = await fetchAllPages(monthUrl);
      const rawAdsets: any[] = [];
      const includedAdsets: any[] = [];
      const excludedAdsets: any[] = [];

      let totalRawLC = 0, totalRawLP = 0;
      let totalIncludedLC = 0, totalIncludedLP = 0;

      for (const row of monthRows) {
        const cn = row.campaign_name || '';
        const an = row.adset_name || '';
        let lc = 0, lp = 0;

        if (row.actions && Array.isArray(row.actions)) {
          row.actions.forEach((a: any) => {
            if (a.action_type === 'link_click') lc += parseInt(a.value || '0', 10);
            if (a.action_type === 'landing_page_view') lp += parseInt(a.value || '0', 10);
          });
        }

        totalRawLC += lc;
        totalRawLP += lp;
        rawAdsets.push({ campaign_name: cn, adset_name: an, link_clicks: lc, landing_page_views: lp });

        const passesCategory = matchesCategoryForMetrics(cn.toLowerCase(), an.toLowerCase(), category);
        const funnel = classifyFunnel(cn.toLowerCase());

        if (passesCategory && funnel) {
          totalIncludedLC += lc;
          totalIncludedLP += lp;
          includedAdsets.push({ campaign_name: cn, adset_name: an, link_clicks: lc, landing_page_views: lp });
        } else {
          excludedAdsets.push({
            campaign_name: cn,
            adset_name: an,
            link_clicks: lc,
            landing_page_views: lp,
            reason: !passesCategory ? 'Category Filter' : 'Funnel Filter (Not Top/Mid/Bot/Growth)'
          });
        }
      }

      // Sort for top 20
      includedAdsets.sort((a, b) => b.link_clicks - a.link_clicks);
      excludedAdsets.sort((a, b) => b.link_clicks - a.link_clicks);

      return NextResponse.json({
        rawAdsets,
        includedAdsets: includedAdsets.slice(0, 20),
        excludedAdsets: excludedAdsets.slice(0, 20),
        totals: {
          raw: { adsets: rawAdsets.length, lc: totalRawLC, lp: totalRawLP },
          included: { adsets: includedAdsets.length, lc: totalIncludedLC, lp: totalIncludedLP },
          excluded: { adsets: excludedAdsets.length }
        }
      });
    }

    [monthRows, dayRows] = await Promise.all([
      fetchAllPages(monthUrl),
      fetchAllPages(dayUrl)
    ]);

    const monthlyData = groupRows(monthRows, category);
    const dailyData = groupRows(dayRows, category);

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
      daily: dailyData,
      periods: {
        months: Array.from(monthPeriods).sort(),
        days: Array.from(dayPeriods).sort()
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
