import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
export async function GET() {
  try {
    const rows = await queryAllGoogleAdsAccounts("SELECT customer.id, metrics.cost_micros FROM customer WHERE segments.date BETWEEN '2026-06-01' AND '2026-06-16'");
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
