import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';

export const dynamic = 'force-dynamic';

const ACCOUNT_ID = 'act_2240079932900749';
const BASE_URL = 'https://graph.facebook.com/v19.0';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });

    const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today = new Date(istString);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    const firstDayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;

    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = yesterday.getDate();
    const daysRemaining = totalDays - daysPassed;

    const mtdUrl = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend&level=adset&breakdowns=region&time_range=${encodeURIComponent(JSON.stringify({ since: firstDayStr, until: yStr }))}&limit=500&access_token=${token}`;
    const yesterdayUrl = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend&level=adset&breakdowns=region&time_range=${encodeURIComponent(JSON.stringify({ since: yStr, until: yStr }))}&limit=500&access_token=${token}`;

    const [mtdData, yesterdayData] = await Promise.all([
      fetchAllPages(mtdUrl),
      fetchAllPages(yesterdayUrl)
    ]);

    const regionMap = new Map<string, { region: string, mtd: number, yesterday: number }>();

    const processRow = (row: any, isMtd: boolean) => {
      const reg = row.region || 'Unknown';
      const spend = parseFloat(row.spend || '0');

      if (!regionMap.has(reg)) {
        regionMap.set(reg, { region: reg, mtd: 0, yesterday: 0 });
      }

      const node = regionMap.get(reg)!;
      if (isMtd) {
        node.mtd += spend;
      } else {
        node.yesterday += spend;
      }
    };

    for (const row of mtdData) {
      processRow(row, true);
    }
    for (const row of yesterdayData) {
      processRow(row, false);
    }

    const finalRegions = Array.from(regionMap.values()).sort((a, b) => b.mtd - a.mtd);

    return NextResponse.json({
      regions: finalRegions,
      daysTotal: totalDays,
      daysPassed,
      daysRemaining
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
