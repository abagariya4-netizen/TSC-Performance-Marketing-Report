import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { matchesCampaign } from '@/lib/metricUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'All';
    const funnel   = searchParams.get('funnel')   || 'All';
    const since    = searchParams.get('since')    || '';
    const until    = searchParams.get('until')    || '';

    const token     = process.env.META_ACCESS_TOKEN!;
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const BASE      = 'https://graph.facebook.com/v19.0';

    // Fetch month-level data
    const monthUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,spend,actions`
      + `&time_increment=monthly`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      + `&level=campaign&limit=500`
      + `&access_token=${token}`;

    // Fetch day-level data
    const dayUrl = `${BASE}/${accountId}/insights`
      + `?fields=campaign_name,spend,actions`
      + `&time_increment=1`
      + `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
      + `&level=campaign&limit=500`
      + `&access_token=${token}`;

    const [monthRows, dayRows] = await Promise.all([
      fetchAllPages(monthUrl),
      fetchAllPages(dayUrl),
    ]);

    // Group and filter by category+funnel
    const groupRows = (rows: any[]) => {
      const grouped: Record<string, {
        period: string; spend: number;
        link_clicks: number; landing_page_views: number
      }> = {};

      rows.forEach(row => {
        if (!matchesCampaign(row.campaign_name || '', category, funnel)) return;
        const period = row.date_start; // YYYY-MM-DD or YYYY-MM-01
        if (!grouped[period]) {
          grouped[period] = { period, spend: 0, link_clicks: 0, landing_page_views: 0 };
        }
        
        let lc = 0;
        let lp = 0;
        if (row.actions && Array.isArray(row.actions)) {
          const lcAction = row.actions.find((a: any) => a.action_type === 'link_click');
          const lpAction = row.actions.find((a: any) => a.action_type === 'landing_page_view');
          if (lcAction) lc = parseInt(lcAction.value, 10);
          if (lpAction) lp = parseInt(lpAction.value, 10);
        }

        grouped[period].spend               += Math.round(parseFloat(row.spend || '0'));
        grouped[period].link_clicks         += lc;
        grouped[period].landing_page_views  += lp;
      });

      return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    }

    return NextResponse.json({
      monthly: groupRows(monthRows),
      daily:   groupRows(dayRows),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
