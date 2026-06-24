import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { getMonthsInRange } from '@/lib/dateRangeUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const keyword = searchParams.get('keyword');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    if (!campaignId || !startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'campaignId, startDate and endDate are required' }, { status: 400 });
    }

    const months = getMonthsInRange(new Date(startDateStr), new Date(endDateStr));
    
    const fetchMonthData = async (monthObj: any) => {
      let keywordFilter = '';
      if (keyword && keyword !== 'All Keywords') {
        keywordFilter = ` AND ad_group_criterion.keyword.text = '${keyword}'`;
      }

      const gaql = `
        SELECT
          search_term_view.search_term,
          metrics.cost_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions_value
        FROM search_term_view
        WHERE campaign.id = '${campaignId}'
        AND segments.date BETWEEN '${monthObj.startDate}' AND '${monthObj.endDate}'
        ${keywordFilter}
      `;

      const results = await queryAllGoogleAdsAccounts(gaql);
      
      const termMap = new Map<string, any>();
      for (const row of results) {
        const term = row.searchTermView?.searchTerm;
        if (term) {
          const cost = (row.metrics?.costMicros || 0) / 1000000;
          const clicks = row.metrics?.clicks || 0;
          const impressions = row.metrics?.impressions || 0;
          const convValue = row.metrics?.conversionsValue || 0;
          
          if (!termMap.has(term)) {
            termMap.set(term, { spend: 0, clicks: 0, impressions: 0, convValue: 0 });
          }
          const existing = termMap.get(term);
          existing.spend += cost;
          existing.clicks += clicks;
          existing.impressions += impressions;
          existing.convValue += convValue;
        }
      }
      
      // Calculate final ratios per term
      const finalMap = new Map<string, any>();
      termMap.forEach((metrics, term) => {
        const roas = metrics.spend > 0 ? metrics.convValue / metrics.spend : 0;
        const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
        const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
        
        finalMap.set(term, {
          spend: metrics.spend,
          roas: roas,
          ctr: ctr,
          cpc: cpc,
          _raw: metrics // save raw for total aggregation
        });
      });
      
      return { label: monthObj.label, data: finalMap };
    };

    const allData = await Promise.all(months.map(m => fetchMonthData(m)));
    
    const termToRow = new Map<string, any>();
    const totalRow: any = {};
    
    // Initialize totals
    months.forEach(m => {
      totalRow[m.label] = { spend: 0, clicks: 0, impressions: 0, convValue: 0, roas: 0, ctr: 0, cpc: 0 };
    });

    for (const res of allData) {
      const monthLabel = res.label;
      res.data.forEach((metrics: any, term: string) => {
        if (!termToRow.has(term)) {
          termToRow.set(term, { term });
        }
        termToRow.get(term)[monthLabel] = {
          spend: metrics.spend,
          roas: metrics.roas,
          ctr: metrics.ctr,
          cpc: metrics.cpc
        };
        
        // Aggregate totals
        totalRow[monthLabel].spend += metrics._raw.spend;
        totalRow[monthLabel].clicks += metrics._raw.clicks;
        totalRow[monthLabel].impressions += metrics._raw.impressions;
        totalRow[monthLabel].convValue += metrics._raw.convValue;
      });
    }
    
    // Calculate total ratios
    months.forEach(m => {
      const t = totalRow[m.label];
      t.roas = t.spend > 0 ? t.convValue / t.spend : 0;
      t.ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
      t.cpc = t.clicks > 0 ? t.spend / t.clicks : 0;
      delete t.clicks;
      delete t.impressions;
      delete t.convValue;
    });
    
    const searchTerms = Array.from(termToRow.values());

    return NextResponse.json({ 
      searchTerms,
      total: totalRow,
      monthLabels: months.map(m => m.label)
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
