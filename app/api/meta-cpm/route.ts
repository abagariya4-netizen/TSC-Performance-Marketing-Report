import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { classifyFunnel } from '@/lib/metricUtils';

function groupRows(rows: any[], cat: string) {
  const result: Record<string, Record<string, {
    spend: number; impressions: number;
  }>> = {};

  const keywordMap: Record<string, string> = {
    'Mattress': 'mat', 'Chair': 'chair', 'Sofa': 'sofa',
    'Desk': 'desk', 'Foot Massager': 'foot', 'Elite': 'elite',
    'Accessories': 'acce', 'Bed': 'bed',
  };

  rows.forEach(row => {
    const cn = (row.campaign_name || '').toLowerCase();
    const an = (row.adset_name   || '').toLowerCase();

    // Always skip growth and boost
    if (cn.includes('growth') || cn.includes('boost')) return;

    // Category filter
    if (cat !== 'All') {
      const kw = keywordMap[cat];
      // Check if adset is a product creative (has _all_asset or _video)
      const isProductCreative = an.includes('_all_asset') || an.includes('_video');

      if (isProductCreative) {
        // Classify by ADSET name keyword (not campaign name)
        // e.g. "Mattress_All_Asset" → 'mat' → include for Mattress
        // e.g. "Chair_All_Asset" → no 'mat' → exclude from Mattress
        if (kw && !an.includes(kw)) return;
      } else {
        // Classify by CAMPAIGN name
        // Campaign must contain the category keyword
        if (kw && !cn.includes(kw)) return;

        // Campaign must not contain other product words
        const catExcludes: Record<string, string[]> = {
          'Mattress': ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'],
          'Chair':    ['mattress','sofa','desk'],
          'Sofa':     ['mattress','chair','desk'],
          'Desk':     ['mattress','chair','sofa'],
          'Foot Massager': ['mattress','chair','sofa','desk'],
          'Elite':    ['mattress'],
          'Accessories': ['mattress'],
          'Bed':      ['mattress'],
        };
        const excludes = catExcludes[cat] || [];
        for (const exc of excludes) {
          if (cn.includes(exc)) return;
        }
      }
    }

    // Funnel classification by campaign name
    const funnel = classifyFunnel(cn);
    if (!funnel) return;

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

    const token     = process.env.META_ACCESS_TOKEN!;
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const BASE      = 'https://graph.facebook.com/v19.0';

    // Fetch month-level data
    const monthUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,impressions`
      + `&time_increment=monthly`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      + `&level=adset&limit=500`
      + `&access_token=${token}`;

    // For day-level data, fetch only the current month (month of 'until')
    const untilDate = until ? new Date(until) : new Date();
    const daySinceStr = `${untilDate.getFullYear()}-${String(untilDate.getMonth() + 1).padStart(2, '0')}-01`;

    const dayUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,adset_name,spend,impressions`
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
