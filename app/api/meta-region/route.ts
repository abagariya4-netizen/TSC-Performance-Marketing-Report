import { NextResponse, NextRequest } from 'next/server';
import { fetchAllPages, buildCampaignUrl } from '@/lib/metaApi';
import { includeInRegion } from '@/lib/classify';
import { calcRow } from '@/lib/calculations';
import { getDateParams } from '@/lib/dateUtils';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const dates     = getDateParams();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fmt = (dObj: Date) => {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const firstDay = new Date(today);
    firstDay.setDate(1);

    dates.sinceMTD = fmt(firstDay);
    dates.untilMTD = fmt(yesterday);
    dates.sinceYday = fmt(yesterday);
    dates.untilYday = fmt(yesterday);

    const mtdUrl  = buildCampaignUrl(accountId, token, dates.sinceMTD,  dates.untilMTD);
    const ydayUrl = buildCampaignUrl(accountId, token, dates.sinceYday, dates.untilYday);

    const mtdRows = await fetchAllPages(mtdUrl);
    const ydayRows = await fetchAllPages(ydayUrl);

    const mtdByRegion:  Record<string, number> = {};
    const ydayByRegion: Record<string, number> = {};

    for (const row of mtdRows) {
      if (!includeInRegion(row.campaign_name)) continue;
      const r = row.region || 'Unknown';
      mtdByRegion[r] = (mtdByRegion[r] || 0) + Math.round(parseFloat(row.spend) || 0);
    }
    for (const row of ydayRows) {
      if (!includeInRegion(row.campaign_name)) continue;
      const r = row.region || 'Unknown';
      ydayByRegion[r] = (ydayByRegion[r] || 0) + Math.round(parseFloat(row.spend) || 0);
    }

    return NextResponse.json({
      regions: { mtd: mtdByRegion, yday: ydayByRegion },
      dates: {
        daysPassed:    dates.daysPassed,
        totalDays:     dates.totalDays,
        daysRemaining: dates.daysRemaining,
        displayMonth:  dates.displayMonth,
        untilMTD:      dates.untilMTD,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
