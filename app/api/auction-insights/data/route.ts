import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';

export const dynamic = 'force-dynamic';

function getFourMonths(endDateStr: string) {
  const endDate = new Date(endDateStr);
  const months = [];
  for (let i = 0; i < 4; i++) {
    // If i===0, end date is the exact provided endDate.
    // If i>0, end date is the last day of that month (Date(y, m, 0))
    const end = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, i === 0 ? endDate.getDate() : 0);
    const start = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    months.push({
      label: start.toLocaleString('default', { month: 'short' }).toLowerCase(), // e.g. "jun"
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }
  return months.reverse(); // [Month1, Month2, Month3, Month4]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const keyword = searchParams.get('keyword');
    const endDateStr = searchParams.get('endDate');
    
    if (!campaignId || !endDateStr) {
      return NextResponse.json({ error: 'campaignId and endDate are required' }, { status: 400 });
    }

    const months = getFourMonths(endDateStr);
    
    const fetchMonthData = async (monthObj: any) => {
      let resource = 'campaign';
      let keywordFilter = '';
      if (keyword && keyword !== 'All Keywords') {
        resource = 'keyword_view';
        keywordFilter = ` AND ad_group_criterion.keyword.text = '${keyword}'`;
      }

      const gaql = `
        SELECT
          segments.auction_insight_domain,
          metrics.auction_insight_search_impression_share,
          metrics.auction_insight_search_overlap_rate,
          metrics.auction_insight_search_position_above_rate,
          metrics.auction_insight_search_top_impression_percentage,
          metrics.auction_insight_search_absolute_top_impression_percentage,
          metrics.auction_insight_search_outranking_share
        FROM ${resource}
        WHERE campaign.id = '${campaignId}'
        AND segments.date BETWEEN '${monthObj.start}' AND '${monthObj.end}'
        ${keywordFilter}
      `;

      const results = await queryAllGoogleAdsAccounts(gaql);
      
      const domainMap = new Map<string, any>();
      for (const row of results) {
        const domain = row.segments?.auctionInsightDomain;
        if (domain) {
          domainMap.set(domain, {
            impressionShare: row.metrics?.auctionInsightSearchImpressionShare || 0,
            overlapRate: row.metrics?.auctionInsightSearchOverlapRate || 0,
            positionAboveRate: row.metrics?.auctionInsightSearchPositionAboveRate || 0,
            topOfPageRate: row.metrics?.auctionInsightSearchTopImpressionPercentage || 0,
            absTopOfPageRate: row.metrics?.auctionInsightSearchAbsoluteTopImpressionPercentage || 0,
            outrankingShare: row.metrics?.auctionInsightSearchOutrankingShare || 0,
          });
        }
      }
      return { label: monthObj.label, data: domainMap };
    };

    const allData = await Promise.all(months.map(m => fetchMonthData(m)));
    
    // Combine into final JSON structure
    const domainToRow = new Map<string, any>();
    
    for (const res of allData) {
      const monthLabel = res.label;
      res.data.forEach((metrics: any, domain: string) => {
        if (!domainToRow.has(domain)) {
          domainToRow.set(domain, { domain });
        }
        domainToRow.get(domain)[monthLabel] = metrics;
      });
    }
    
    const domains = Array.from(domainToRow.values());

    return NextResponse.json({ 
      domains, 
      monthLabels: months.map(m => m.label) // Send back labels so UI knows what to render
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
