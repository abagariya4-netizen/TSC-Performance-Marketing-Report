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

function isProductCreative(adsetName: string): boolean {
  const lower = adsetName.toLowerCase();
  return lower.includes('_all_asset') || lower.includes(' all asset') || lower.includes('_video') || lower.includes(' video');
}

function passesCategoryFilter(cName: string, aName: string, category: string): boolean {
  const lowerC = cName.toLowerCase();
  const lowerA = aName.toLowerCase();

  // Adset exclusions (always apply)
  if (category === 'Mattress') {
    if (['sofa', 'desk', 'chair', 'boost', 'growth'].some(ex => lowerA.includes(ex))) return false;
  } else if (category === 'Chair') {
    if (['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => lowerA.includes(ex))) return false;
  } else if (category === 'Desk') {
    if (['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'].some(ex => lowerA.includes(ex))) return false;
  } else {
    if (['boost', 'growth'].some(ex => lowerA.includes(ex))) return false;
  }

  // Campaign exclusions (always apply)
  if (category === 'All') {
    if (['chair', 'desk', 'sofa', 'elite', 'foot', 'growth'].some(ex => lowerC.includes(ex))) return false;
  }

  if (isProductCreative(aName)) {
    if (category === 'All') return true;
    if (category === 'Mattress') return lowerA.includes('mat');
    if (category === 'Chair') return lowerA.includes('chair');
    if (category === 'Sofa') return lowerA.includes('sofa');
    if (category === 'Desk') return lowerA.includes('desk');
    if (category === 'Elite') return lowerA.includes('elite');
    if (category === 'Foot Massager') return lowerA.includes('foot');
    if (category === 'Accessories') return lowerA.includes('acce');
    if (category === 'Bed') return lowerA.includes('bed');
  } else {
    if (category === 'All') return true;
    if (category === 'Mattress') {
      if (!lowerC.includes('mat')) return false;
      const ex = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
      if (ex.some(e => lowerC.includes(e))) return false;
      return true;
    }
    if (category === 'Chair') return lowerC.includes('chair');
    if (category === 'Sofa') return lowerC.includes('sofa');
    if (category === 'Desk') return lowerC.includes('desk');
    if (category === 'Elite') return lowerC.includes('elite');
    if (category === 'Foot Massager') return lowerC.includes('foot');
    if (category === 'Accessories') return lowerC.includes('acce');
    if (category === 'Bed') return lowerC.includes('bed');
  }

  return false;
}

function getFunnel(cName: string, region: string): string {
  const lower = cName.toLowerCase();
  if (lower.includes('group')) return 'Group';
  if (lower.includes('rnf') && (region === 'Maharashtra' || region === 'Tamil Nadu')) return 'RNF';
  if (lower.includes('growth')) return 'Growth';
  if (lower.includes('bot')) return 'Bottom';
  if (lower.includes('mid')) return 'Mid';
  return 'Top';
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });
    
    const { searchParams } = new URL(req.url);
    const categoryFilter = searchParams.get('category') || 'All';
    const regionFilter = searchParams.get('region');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!regionFilter) {
      return NextResponse.json({ error: 'region is required' }, { status: 400 });
    }

    const accountId = process.env.META_AD_ACCOUNT_ID!;
    const dates = getDateParams();
    
    const sinceMTD = startDate || dates.sinceMTD;
    const untilMTD = endDate || dates.untilMTD;
    const sinceYday = endDate || dates.sinceYday;
    const untilYday = endDate || dates.untilYday;

    const buildAdsetUrl = (accId: string, tok: string, since: string, until: string) => {
      const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
      return `https://graph.facebook.com/v19.0/${accId}/insights?fields=campaign_name,adset_name,spend&level=adset&breakdowns=region&time_range=${timeRange}&limit=500&access_token=${tok}`;
    };

    const mtdUrl = buildAdsetUrl(accountId, token, sinceMTD, untilMTD);
    const ydayUrl = buildAdsetUrl(accountId, token, sinceYday, untilYday);

    const [mtdRows, ydayRows] = await Promise.all([
      fetchAllPages(mtdUrl),
      fetchAllPages(ydayUrl)
    ]);

    const mtdData: Record<string, number> = { 'Top': 0, 'Mid': 0, 'Bottom': 0, 'RNF': 0, 'Group': 0 };
    const ydayData: Record<string, number> = { 'Top': 0, 'Mid': 0, 'Bottom': 0, 'RNF': 0, 'Group': 0 };

    const allowedRegions = SIX_CITIES[regionFilter] || [];

    const processRows = (rows: any[], target: Record<string, number>) => {
      for (const row of rows) {
        const cName = row.campaign_name || '';
        const aName = row.adset_name || '';
        const rowRegion = row.region || '';

        if (!allowedRegions.includes(rowRegion)) continue;
        if (!passesCategoryFilter(cName, aName, categoryFilter)) continue;

        const funnel = getFunnel(cName, regionFilter);
        if (funnel === 'Growth') continue; // Skipped per requirements
        
        const spend = Math.round(parseFloat(row.spend) || 0);
        target[funnel] = (target[funnel] || 0) + spend;
      }
    };

    processRows(mtdRows, mtdData);
    processRows(ydayRows, ydayData);

    const funnelsArray = ['Top', 'Mid', 'Bottom', 'Group'];
    if (regionFilter === 'Maharashtra' || regionFilter === 'Tamil Nadu') {
      funnelsArray.splice(3, 0, 'RNF'); // Insert RNF before Group
    }

    const funnels = funnelsArray.map(f => ({
      funnel: f,
      mtd: mtdData[f] || 0,
      yesterday: ydayData[f] || 0
    }));

    return NextResponse.json({
      funnels,
      region: regionFilter,
      daysTotal: dates.totalDays,
      daysPassed: dates.daysPassed,
      daysRemaining: dates.daysRemaining
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
