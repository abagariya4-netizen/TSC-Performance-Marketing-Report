import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { classifyFunnel } from '@/lib/metricUtils';

function groupRows(rows: any[], cat: string) {
  const result: Record<string, Record<string, {
    spend: number; impressions: number;
  }>> = { TOP: {}, MID: {}, BOTTOM: {}, GROWTH: {} };

  function isProductCreative(adsetName: string): boolean {
    const lower = adsetName.toLowerCase();
    return lower.includes('_all_asset') || lower.includes(' all asset') || lower.includes('_video') || lower.includes(' video');
  }

  function passesCategoryFilter(campaignName: string, adsetName: string, category: string): boolean {
    if (category === 'All') return true;
    
    const lowerCamp = campaignName.toLowerCase();
    const lowerAdset = adsetName.toLowerCase();

    if (isProductCreative(adsetName)) {
      if (category === 'Mattress') return lowerAdset.includes('mat');
      if (category === 'Chair') return lowerAdset.includes('chair');
      if (category === 'Sofa') return lowerAdset.includes('sofa');
      if (category === 'Desk') return lowerAdset.includes('desk');
      if (category === 'Elite') return lowerAdset.includes('elite');
      if (category === 'Foot Massager') return lowerAdset.includes('foot');
      if (category === 'Accessories') return lowerAdset.includes('acce');
      if (category === 'Bed') return lowerAdset.includes('bed');
      return false;
    } else {
      if (category === 'Mattress') {
        if (!lowerCamp.includes('mat')) return false;
        const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
        if (excludes.some(ex => lowerCamp.includes(ex))) return false;
        return true;
      }
      if (category === 'Chair') return lowerCamp.includes('chair');
      if (category === 'Sofa') return lowerCamp.includes('sofa');
      if (category === 'Desk') return lowerCamp.includes('desk');
      if (category === 'Elite') return lowerCamp.includes('elite');
      if (category === 'Foot Massager') return lowerCamp.includes('foot');
      if (category === 'Accessories') return lowerCamp.includes('acce');
      if (category === 'Bed') return lowerCamp.includes('bed');
      return false;
    }
  }

  function passesAdsetExclusions(adsetName: string, category: string): boolean {
    const lower = adsetName.toLowerCase();
    if (category === 'Mattress') {
      return !['sofa', 'desk', 'chair', 'boost', 'growth'].some(ex => lower.includes(ex));
    } else if (category === 'Chair') {
      return !['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => lower.includes(ex));
    } else if (category === 'Desk') {
      return !['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'].some(ex => lower.includes(ex));
    } else {
      return !['boost', 'growth'].some(ex => lower.includes(ex));
    }
  }

  function isCampaignExcluded(campaignName: string): boolean {
    const lower = campaignName.toLowerCase();
    if (lower.includes('boost')) return true;
    return false;
  }

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

    if (isCampaignExcluded(cn)) return;
    if (!passesCategoryFilter(cn, an, cat)) return;
    if (!passesAdsetExclusions(an, cat)) return;

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
