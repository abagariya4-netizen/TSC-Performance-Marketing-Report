import { NextResponse, NextRequest } from 'next/server';
import { fetchAllPages, buildAdsetUrl } from '@/lib/metaApi';
import { includeInRegion } from '@/lib/classify';
import { calcRow } from '@/lib/calculations';
import { matchesCategoryForMetrics } from '@/lib/metricUtils';
import { getDateParams } from '@/lib/dateUtils';

const CAMPAIGN_EXCLUSION_KEYWORDS = ['chair', 'desk', 'sofa', 'elite', 'foot', 'growth', 'acce'];
const ADSET_EXCLUSION_KEYWORDS = ['boost', 'growth'];

function isCampaignExcluded(name: string): boolean {
  const cn = (name || '').toLowerCase();
  return CAMPAIGN_EXCLUSION_KEYWORDS.some(kw => cn.includes(kw));
}

function isAdsetExcluded(name: string): boolean {
  const an = (name || '').toLowerCase();
  return ADSET_EXCLUSION_KEYWORDS.some(kw => an.includes(kw));
}

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

    const mtdUrl  = buildAdsetUrl(accountId, token, dates.sinceMTD,  dates.untilMTD);
    const ydayUrl = buildAdsetUrl(accountId, token, dates.sinceYday, dates.untilYday);

    const [mtdRows, ydayRows] = await Promise.all([
      fetchAllPages(mtdUrl),
      fetchAllPages(ydayUrl)
    ]);

    const mtdByRegion:  Record<string, number> = {};
    const ydayByRegion: Record<string, number> = {};

    const processRow = (row: any, isMtd: boolean) => {
      const cName = row.campaign_name || '';
      const aName = row.adset_name || '';

      const cn = cName.toLowerCase();
      const an = aName.toLowerCase();

      // Use centralized matching logic for 'All' category (which allows dhoni adsets if they contain 'mat')
      if (!matchesCategoryForMetrics(cn, an, 'All')) return;

      if (!includeInRegion(cName)) return;

      const r = row.region || 'Unknown';
      const spend = Math.round(parseFloat(row.spend) || 0);

      if (isMtd) {
        mtdByRegion[r] = (mtdByRegion[r] || 0) + spend;
      } else {
        ydayByRegion[r] = (ydayByRegion[r] || 0) + spend;
      }
    };

    for (const row of mtdRows) {
      processRow(row, true);
    }
    for (const row of ydayRows) {
      processRow(row, false);
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
