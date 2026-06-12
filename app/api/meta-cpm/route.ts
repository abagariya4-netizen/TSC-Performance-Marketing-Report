import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { matchesCategoryForMetrics, classifyFunnel, FUNNELS, Funnel, CATEGORY_RULES } from '@/lib/metricUtils';

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
      + `?fields=campaign_name,spend,impressions`
      + `&time_increment=monthly`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      + `&level=campaign&limit=500`
      + `&access_token=${token}`;

    // For day-level data, fetch only the current month (month of 'until')
    const untilDate = until ? new Date(until) : new Date();
    const daySinceStr = `${untilDate.getFullYear()}-${String(untilDate.getMonth() + 1).padStart(2, '0')}-01`;

    const dayUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,spend,impressions`
      + `&time_increment=1`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since: daySinceStr, until }))}`
      + `&level=campaign&limit=500`
      + `&access_token=${token}`;

    const [monthRows, dayRows] = await Promise.all([
      fetchAllPages(monthUrl),
      fetchAllPages(dayUrl)
    ]);

    const getEmptyGroup = () => ({
      TOP: {}, MID: {}, BOTTOM: {}, GROWTH: {}
    });

    const monthlyData: Record<Funnel, Record<string, any>> = getEmptyGroup();
    const dailyData: Record<Funnel, Record<string, any>>   = getEmptyGroup();
    
    const monthPeriods = new Set<string>();
    const dayPeriods   = new Set<string>();

    const processRows = (rows: any[], targetMap: Record<Funnel, Record<string, any>>, periodSet: Set<string>) => {
      rows.forEach(row => {
        const campaignName = row.campaign_name || '';
        const funnel       = classifyFunnel(campaignName);
        if (!funnel) return;

        if (funnel === 'GROWTH') {
          if (category !== 'All') {
            const cn = campaignName.toLowerCase();
            const rule = CATEGORY_RULES[category];
            if (rule?.campaign.contains && !cn.includes(rule.campaign.contains)) return;
          }
        } else {
          if (!matchesCategoryForMetrics(campaignName, category)) return;
        }

        const period = row.date_start; // YYYY-MM-DD or YYYY-MM-01
        periodSet.add(period);

        if (!targetMap[funnel][period]) {
          targetMap[funnel][period] = { spend: 0, impressions: 0 };
        }
        
        // ADD every row — do NOT check for duplicates
        // Meta API returns multiple rows per adset (different variations/placements)
        // ALL must be counted
        targetMap[funnel][period].spend       += Math.round(parseFloat(row.spend || '0'));
        targetMap[funnel][period].impressions += parseInt(row.impressions || '0', 10);
      });
    };

    processRows(monthRows, monthlyData, monthPeriods);
    processRows(dayRows, dailyData, dayPeriods);

    const sortedMonths = Array.from(monthPeriods).sort();
    const sortedDays   = Array.from(dayPeriods).sort();

    return NextResponse.json({
      monthly: monthlyData,
      daily:   dailyData,
      periods: {
        months: sortedMonths,
        days:   sortedDays
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
