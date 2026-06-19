import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { getCleanProductName } from '@/lib/productTitleMap';
import { getCategoryForProduct } from '@/lib/productCategoryMap';

export const dynamic = 'force-dynamic';

const DATE_RANGES = [
  { key: 'mar', start: '2026-03-01', end: '2026-03-31' },
  { key: 'apr', start: '2026-04-01', end: '2026-04-30' },
  { key: 'may', start: '2026-05-01', end: '2026-05-31' },
  { key: 'jun1_15', start: '2026-06-01', end: '2026-06-15' },
  { key: 'junLast3', start: '2026-06-16', end: '2026-06-18' }
];

const EXCLUSIONS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

function isExcluded(campaignName: string) {
  const lower = (campaignName || '').toLowerCase();
  return EXCLUSIONS.some(ex => lower.includes(ex));
}

export async function GET() {
  try {
    const promises = DATE_RANGES.map(async (range) => {
      const gaql = `
        SELECT segments.product_title, campaign.name, 
        campaign.advertising_channel_type, metrics.cost_micros
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
        AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
      `;
      const data = await queryAllGoogleAdsAccounts(gaql);
      return { key: range.key, data };
    });

    const results = await Promise.all(promises);

    const categoryTotals: Record<string, Record<string, number>> = {};
    const productSpends: Record<string, Record<string, Record<string, number>>> = {};

    results.forEach(({ key, data }) => {
      data.forEach((row: any) => {
        const campaignName = row.campaign?.name || '';
        if (isExcluded(campaignName)) return;

        const rawTitle = row.segments?.productTitle || 'Unknown';
        const cost = Number(row.metrics?.costMicros || 0) / 1000000;

        const cleanName = getCleanProductName(rawTitle);
        const category = getCategoryForProduct(cleanName);

        if (!categoryTotals[category]) categoryTotals[category] = {};
        if (!categoryTotals[category][key]) categoryTotals[category][key] = 0;
        categoryTotals[category][key] += cost;

        if (!productSpends[category]) productSpends[category] = {};
        if (!productSpends[category][cleanName]) productSpends[category][cleanName] = {};
        if (!productSpends[category][cleanName][key]) productSpends[category][cleanName][key] = 0;
        
        productSpends[category][cleanName][key] += cost;
      });
    });

    const outputCategories: any = {};

    for (const [category, products] of Object.entries(productSpends)) {
      const productArr = [];
      for (const [productName, spends] of Object.entries(products)) {
        const mar = spends['mar'] || 0;
        const apr = spends['apr'] || 0;
        const may = spends['may'] || 0;
        const jun1_15 = spends['jun1_15'] || 0;
        const junLast3 = spends['junLast3'] || 0;

        const catMar = categoryTotals[category]['mar'] || 1;
        const catApr = categoryTotals[category]['apr'] || 1;
        const catMay = categoryTotals[category]['may'] || 1;
        const catJun1_15 = categoryTotals[category]['jun1_15'] || 1;
        const catJunLast3 = categoryTotals[category]['junLast3'] || 1;

        const avg3Months = (mar + apr + may) / 3;
        const vsLastMonth = may > 0 ? ((junLast3 - may) / may) * 100 : null; // Wait, comparison for junLast3 might be different. Let's compare to May as "last full month". Actually, usually vs Last Month implies current vs previous period. Let's define vsLastMonth as (junLast3 - jun1_15)/jun1_15 ? No, comparing 3 days to 15 days is weird. Wait, the prompt says vs Last Month. We'll use ((junLast3 - may)/may)*100.
        // Actually, let's just do ((junLast3 - may)/may) * 100. Wait! The prompt says currentPeriod is the one we compare. Since junLast3 is partial, comparing vs May directly might be a huge negative.
        // Let's implement exactly what is asked: vsLastMonth = ((junLast3 - may) / may) * 100.
        const vsAvg3M = avg3Months > 0 ? ((junLast3 - avg3Months) / avg3Months) * 100 : null;

        productArr.push({
          name: productName,
          mar, apr, may, jun1_15, junLast3,
          salienceMar: (mar / catMar) * 100,
          salienceApr: (apr / catApr) * 100,
          salienceMay: (may / catMay) * 100,
          salienceJun1_15: (jun1_15 / catJun1_15) * 100,
          salienceJunLast3: (junLast3 / catJunLast3) * 100,
          vsLastMonth: vsLastMonth,
          vsAvg3Months: vsAvg3M,
        });
      }
      
      productArr.sort((a, b) => b.junLast3 - a.junLast3);
      outputCategories[category] = { products: productArr };
    }

    const dateRangesMap: Record<string, any> = {};
    DATE_RANGES.forEach(r => { dateRangesMap[r.key] = { start: r.start, end: r.end }; });

    return NextResponse.json({
      categories: outputCategories,
      dateRanges: dateRangesMap
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
