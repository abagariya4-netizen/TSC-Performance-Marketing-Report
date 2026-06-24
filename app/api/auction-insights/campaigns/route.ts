import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const gaql = `
      SELECT campaign.id, campaign.name
      FROM campaign
      WHERE campaign.advertising_channel_type = 'SEARCH'
      AND campaign.status != 'REMOVED'
    `;
    
    const results = await queryAllGoogleAdsAccounts(gaql);
    
    const exclusions = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];
    
    const campaigns: {id: string, name: string}[] = [];
    
    for (const row of results) {
      if (row.campaign && row.campaign.id && row.campaign.name) {
        const nameLower = row.campaign.name.toLowerCase();
        let isExcluded = false;
        for (const ex of exclusions) {
          if (nameLower.includes(ex)) {
            isExcluded = true;
            break;
          }
        }
        if (!isExcluded) {
          campaigns.push({ id: row.campaign.id, name: row.campaign.name });
        }
      }
    }
    
    campaigns.sort((a, b) => a.name.localeCompare(b.name));
    
    // Deduplicate by ID
    const unique = Array.from(new Map(campaigns.map(item => [item.id, item])).values());
    
    return NextResponse.json({ campaigns: unique });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
