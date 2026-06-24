import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const gaql = `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type
      FROM keyword_view
      WHERE campaign.id = '${campaignId}'
      AND ad_group_criterion.status != 'REMOVED'
    `;
    
    const results = await queryAllGoogleAdsAccounts(gaql);
    
    const keywords: {text: string, matchType: string}[] = [];
    
    for (const row of results) {
      if (row.adGroupCriterion && row.adGroupCriterion.keyword) {
        const text = row.adGroupCriterion.keyword.text;
        const matchType = row.adGroupCriterion.keyword.matchType;
        if (text) {
          keywords.push({ text, matchType });
        }
      }
    }
    
    const unique = Array.from(new Map(keywords.map(item => [item.text, item])).values());
    unique.sort((a, b) => a.text.localeCompare(b.text));
    
    return NextResponse.json({ keywords: unique });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
