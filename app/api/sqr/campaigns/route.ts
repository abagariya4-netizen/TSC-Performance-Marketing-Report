import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'All';

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
        
        // Check exclusions
        let isExcluded = false;
        for (const ex of exclusions) {
          if (nameLower.includes(ex)) {
            isExcluded = true;
            break;
          }
        }
        if (isExcluded) continue;

        // Check category
        if (category === 'Mat - Branded') {
          if (!(nameLower.includes('mat') && nameLower.includes('brand'))) continue;
        } else if (category === 'Mat - Non Branded') {
          if (!(nameLower.includes('mat') && !nameLower.includes('brand'))) continue;
        } else if (category === 'Chair') {
          if (!nameLower.includes('chair')) continue;
        } else if (category === 'Sofa') {
          if (!nameLower.includes('sofa')) continue;
        } else if (category === 'Desk') {
          if (!nameLower.includes('desk')) continue;
        } else if (category === 'Elite') {
          if (!nameLower.includes('elite')) continue;
        } else if (category === 'Foot Massager') {
          if (!nameLower.includes('foot')) continue;
        } else if (category === 'Accessories') {
          if (!nameLower.includes('acce')) continue;
        } else if (category === 'Bed') {
          if (!nameLower.includes('bed')) continue;
        }
        // 'All' applies no keyword filter

        campaigns.push({ id: row.campaign.id, name: row.campaign.name });
      }
    }
    
    campaigns.sort((a, b) => a.name.localeCompare(b.name));
    
    const unique = Array.from(new Map(campaigns.map(item => [item.id, item])).values());
    
    return NextResponse.json({ campaigns: unique });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
