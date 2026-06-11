import { NextResponse } from 'next/server';
import { fetchAllPages, buildAdsetUrl } from '@/lib/metaApi';
import { classifyAdset } from '@/lib/classify';
import { getDateParams } from '@/lib/dateUtils';

const SIX_CITIES: Record<string, string[]> = {
  "Maharashtra": ["Maharashtra"],
  "Karnataka":   ["Karnataka"],
  "Tamil Nadu":  ["Tamil Nadu"],
  "Telangana":   ["Telangana"],
  "Delhi+NCR":   ["Delhi", "Haryana", "Uttar Pradesh"],
  "Gujarat":     ["Gujarat"],
};

export async function GET() {
  try {
    const token     = process.env.META_ACCESS_TOKEN!;
    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const dates     = getDateParams();

    const mtdUrl  = buildAdsetUrl(accountId, token, dates.sinceMTD,  dates.untilMTD);
    const ydayUrl = buildAdsetUrl(accountId, token, dates.sinceYday, dates.untilYday);

    const mtdRows = await fetchAllPages(mtdUrl);
    const ydayRows = await fetchAllPages(ydayUrl);

    type CityData = Record<string, Record<string, number>>;
    const mtdData:  CityData = {};
    const ydayData: CityData = {};
    for (const city of Object.keys(SIX_CITIES)) {
      mtdData[city]  = { TOP: 0, MID: 0, BOTTOM: 0, RNF: 0, GROUP: 0, TOTAL: 0 };
      ydayData[city] = { TOP: 0, MID: 0, BOTTOM: 0, RNF: 0, GROUP: 0, TOTAL: 0 };
    }

    const processRows = (rows: any[], target: CityData) => {
      for (const row of rows) {
        const funnel = classifyAdset(row.campaign_name, row.adset_name);
        if (funnel === 'EXCLUDED') continue;
        const spend  = Math.round(parseFloat(row.spend) || 0);
        const region = row.region || '';
        for (const [city, regions] of Object.entries(SIX_CITIES)) {
          if (regions.includes(region)) {
            target[city][funnel] += spend;
            target[city]['TOTAL'] += spend;
            break;
          }
        }
      }
    };

    processRows(mtdRows,  mtdData);
    processRows(ydayRows, ydayData);

    return NextResponse.json({
      cities: { mtd: mtdData, yday: ydayData },
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
