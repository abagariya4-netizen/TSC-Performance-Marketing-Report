import { NextResponse, NextRequest } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { getDateParams } from '@/lib/dateUtils';

const SIX_CITIES: Record<string, string[]> = {
  "Maharashtra": ["Maharashtra"],
  "Karnataka":   ["Karnataka"],
  "Tamil Nadu":  ["Tamil Nadu"],
  "Telangana":   ["Telangana"],
  "Delhi+NCR":   ["Delhi", "Haryana", "Uttar Pradesh"],
  "Gujarat":     ["Gujarat"],
};

const CAMPAIGN_EXCLUSION_KEYWORDS = [
  'chair', 'desk', 'sofa', 'elite',
  'foot', 'growth', 'acce'
];

const ADSET_EXCLUSION_KEYWORDS = ['boost', 'growth'];

function isCampaignExcluded(name: string): boolean {
  const cn = (name || '').toLowerCase();
  return CAMPAIGN_EXCLUSION_KEYWORDS.some(kw => cn.includes(kw));
}

function isAdsetExcluded(name: string): boolean {
  const an = (name || '').toLowerCase();
  return ADSET_EXCLUSION_KEYWORDS.some(kw => an.includes(kw));
}

function buildUrl(
  accountId: string,
  token: string,
  since: string,
  until: string
): string {
  const timeRange = encodeURIComponent(
    JSON.stringify({ since, until })
  );
  return `https://graph.facebook.com/v19.0/${accountId}/insights` +
    `?fields=campaign_name,adset_name,spend` +
    `&breakdowns=region` +
    `&time_range=${timeRange}` +
    `&level=adset` +
    `&limit=500` +
    `&access_token=${token}`;
}

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('meta_token')?.value ||
      process.env.META_ACCESS_TOKEN;
    if (!token)
      return NextResponse.json(
        { error: 'META_ACCESS_TOKEN not set' },
        { status: 500 }
      );

    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const dates = getDateParams();

    const mtdUrl  = buildUrl(accountId, token, dates.sinceMTD,  dates.untilMTD);
    const ydayUrl = buildUrl(accountId, token, dates.sinceYday, dates.untilYday);

    const mtdRows  = await fetchAllPages(mtdUrl);
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
        const campaignName = row.campaign_name || '';
        const adsetName    = row.adset_name    || '';
        const region       = row.region        || '';
        const spend        = Math.round(parseFloat(row.spend) || 0);

        // Skip zero spend rows
        if (spend === 0) continue;

        // STEP 1: Exclude campaigns with excluded keywords
        if (isCampaignExcluded(campaignName)) continue;

        // STEP 2: Exclude adsets with excluded keywords
        if (isAdsetExcluded(adsetName)) continue;

        // STEP 3: Dhoni rule - classify by adset name
        const cn = campaignName.toLowerCase();
        const an = adsetName.toLowerCase();

        if (cn.includes('dhoni')) {
          // For 6 City Meta (All category), only count 
          // mattress-related adsets from Dhoni campaigns
          if (!an.includes('mat')) continue;
        }

        // STEP 4: Funnel classification
        let funnel = 'TOP';
        if (cn.includes('group')) {
          funnel = 'GROUP';
        } else if (cn.includes('rnf')) {
          funnel = 'RNF';
        } else if (cn.includes('bot')) {
          funnel = 'BOTTOM';
        } else if (cn.includes('mid')) {
          funnel = 'MID';
        }

        // STEP 5: City mapping
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
