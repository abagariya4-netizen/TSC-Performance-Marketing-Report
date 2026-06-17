import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
export async function GET() {
  try {
    const rows = await queryAllGoogleAdsAccounts("SELECT campaign.id, campaign.name, metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '2026-06-01' AND '2026-06-16'");
    const formatted = rows.map((r:any) => ({ name: r.campaign?.name, cost: Math.round((r.metrics?.costMicros || 0)/1000000) })).sort((a:any,b:any)=>b.cost-a.cost);
    return NextResponse.json({ total: formatted.reduce((sum:number, r:any)=>sum+r.cost, 0), campaigns: formatted });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
