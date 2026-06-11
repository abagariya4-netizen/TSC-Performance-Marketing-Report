import { NextResponse } from 'next/server';
import { fetchAllPages, buildCampaignUrl } from '@/lib/metaApi';
import { includeInRegion } from '@/lib/classify';
import { calcRow } from '@/lib/calculations';
import { getDateParams } from '@/lib/dateUtils';

export async function GET() {
  try {
    const token     = process.env.META_ACCESS_TOKEN!;
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const dates     = getDateParams();

    const mtdUrl  = buildCampaignUrl(accountId, token, dates.sinceMTD,  dates.untilMTD);
    const ydayUrl = buildCampaignUrl(accountId, token, dates.sinceYday, dates.untilYday);

    const [mtdRows, ydayRows] = await Promise.all([
      fetchAllPages(mtdUrl),
      fetchAllPages(ydayUrl),
    ]);

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
