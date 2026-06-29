import { NextResponse, NextRequest } from 'next/server';
import { fetchAllPages, buildAdsetUrl } from '@/lib/metaApi';

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

function isCampaignExcluded(campaignName: string | null | undefined): boolean {
  if (!campaignName) return false;
  const cn = campaignName.toLowerCase();
  return CAMPAIGN_EXCLUSION_KEYWORDS.some(
    keyword => cn.includes(keyword)
  );
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });
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

    let maharashtraBottomCount = 0;

    const processRows = (rows: any[], target: CityData) => {
      const adsetExcludedKeywords = ['boost', 'growth'];
      
      for (const row of rows) {
        // Debug: log first 5 rows to see actual data structure
        if (rows.indexOf(row) < 5) {
          console.log('ROW SAMPLE:', JSON.stringify({
            campaign_name: row.campaign_name,
            adset_name: row.adset_name,
            region: row.region,
            spend: row.spend
          }));
        }

        // Debug: check if excluded campaigns appear
        const testCampaigns = [
          'tsc_retargeting_chair_bot_funnel_nst',
          'desk_asc_bot_funnel_retargeting',
          'tsc_asc_foot_massager_bot_funnel'
        ];
        const cn_debug = (row.campaign_name || '').toLowerCase();
        if (testCampaigns.some(t => cn_debug.includes('chair') || 
            cn_debug.includes('desk') || cn_debug.includes('foot'))) {
          console.log('FOUND EXCLUDED CAMPAIGN:', row.campaign_name, 
            'excluded:', isCampaignExcluded(row.campaign_name));
        }

        console.log('Campaign:', row.campaign_name, 
                    'Adset:', row.adset_name, 
                    'Region:', row.region,
                    'Spend:', row.spend);

        if (isCampaignExcluded(row.campaign_name)) {
          console.log('Excluding campaign:', row.campaign_name);
          continue;
        }

        const cName = (row.campaign_name || '').toLowerCase();
        const aName = (row.adset_name || '').toLowerCase();

        // STEP 3 - Adset exclusions
        if (adsetExcludedKeywords.some(kw => aName.includes(kw))) {
          continue;
        }

        // Dhoni specific rule
        if (cName.includes('dhoni')) {
          const productKeywords = ['mat', 'chair', 'sofa', 'desk', 'elite', 'foot', 'acce', 'bed'];
          if (!productKeywords.some(kw => aName.includes(kw))) {
            continue;
          }
        }

        // STEP 2 - Funnel classification
        let funnel = 'TOP';
        if (cName.includes('group')) funnel = 'GROUP';
        else if (cName.includes('rnf')) funnel = 'RNF';
        else if (cName.includes('bot') && !cName.includes('growth')) funnel = 'BOTTOM';
        else if (cName.includes('mid') && !cName.includes('group') && !cName.includes('rnf')) funnel = 'MID';
        const spend  = Math.round(parseFloat(row.spend) || 0);
        const region = row.region || '';
        for (const [city, regions] of Object.entries(SIX_CITIES)) {
          if (regions.includes(region)) {
            target[city][funnel] += spend;
            target[city]['TOTAL'] += spend;
            
            if (city === 'Maharashtra' && funnel === 'BOTTOM') {
              maharashtraBottomCount++;
            }
            
            break;
          }
        }
      }
    };

    processRows(mtdRows,  mtdData);
    processRows(ydayRows, ydayData);

    console.log(`Total Maharashtra Bottom Adsets Included: ${maharashtraBottomCount}`);

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
