import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

const EXCLUDED_KEYWORDS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

function isExcluded(campaignName: string) {
  const lower = campaignName.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw));
}

export async function GET() {
  try {
    const gaql = `
      SELECT campaign.id, campaign.name
      FROM campaign
      WHERE campaign.advertising_channel_type = 'SEARCH'
      AND campaign.name REGEXP_MATCH '(?i).*brand.*'
      AND campaign.status != 'REMOVED'
    `;

    const data = await queryAllGoogleAdsAccounts(gaql);
    
    const campaigns: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const row of data) {
      if (!row.campaign?.id || !row.campaign?.name) continue;
      
      const cName = row.campaign.name;
      if (isExcluded(cName)) continue;

      if (!seen.has(row.campaign.id)) {
        seen.add(row.campaign.id);
        campaigns.push({ id: row.campaign.id, name: cName });
      }
    }

    return NextResponse.json({ campaigns });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
