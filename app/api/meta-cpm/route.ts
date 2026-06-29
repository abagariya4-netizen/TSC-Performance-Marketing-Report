import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { classifyFunnel } from '@/lib/metricUtils';

function groupRows(rows: any[], cat: string) {
  const result: Record<string, Record<string, {
    spend: number; impressions: number;
  }>> = { TOP: {}, MID: {}, BOTTOM: {}, GROWTH: {} };

  // Campaign name rules
  const CAMPAIGN_RULES: Record<string, { contains?: string; excludes: string[] }> = {
    'All':          { excludes: ['boost','growth'] },
    'Mattress':     { contains: 'mat', excludes: ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai','boost','growth'] },
    'Chair':        { contains: 'chair', excludes: ['boost','growth','desk','sofa'] },
    'Desk':         { contains: 'desk', excludes: ['boost','growth','chair','sofa'] },
    'Sofa':         { contains: 'sofa', excludes: ['boost','growth','chair','desk'] },
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

  const CATEGORY_KEYWORDS: Record<string, string> = {
    'Mattress': 'mat',
    'Chair': 'chair',
    'Sofa': 'sofa',
    'Desk': 'desk',
    'Elite': 'elite',
    'Foot Massager': 'foot',
    'Accessories': 'acce',
    'Bed': 'bed'
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

    if (!matchesCategoryForMetrics(cn, an, cat)) return;

    // Step 3: Classify funnel by campaign name
    const funnel = classifyFunnel(cn);
    if (!funnel) return;

    // Step 4: Accumulate
    const period = row.date_start;
    const spend  = Math.round(parseFloat(row.spend || '0'));
    const imp    = parseInt(row.impressions || '0', 10);

    if (!result[funnel]) result[funnel] = {};
    if (!result[funnel][period]) {
      result[funnel][period] = { spend: 0, impressions: 0 };
    }
    result[funnel][period].spend       += spend;
    result[funnel][period].impressions += imp;
  });

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'All';
    const since    = searchParams.get('since')    || '';
    const until    = searchParams.get('until')    || '';

  const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const BASE      = 'https://graph.facebook.com/v19.0';

    // Fetch month-level data
    const monthUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,impressions`
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
      + `?fields=campaign_name,adset_name,spend,impressions`
      + `&time_increment=1`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since: daySinceStr, until: dayUntilStr }))}`
      + `&level=adset&limit=500`
      + `&access_token=${token}`;

    const [monthRows, dayRows] = await Promise.all([
      fetchAllPages(monthUrl),
      fetchAllPages(dayUrl)
    ]);

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
