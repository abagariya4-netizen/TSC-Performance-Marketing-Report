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
  { key: 'jun16', start: '2026-06-16', end: '2026-06-16' },
  { key: 'jun17', start: '2026-06-17', end: '2026-06-17' },
  { key: 'jun18', start: '2026-06-18', end: '2026-06-18' },
];

// MTD for Est. Spends formula: 1 June to 18 June (yesterday relative to today=19 June)
const MTD_START = '2026-06-01';
const MTD_END = '2026-06-18';
const YESTERDAY = '2026-06-18';
const TOTAL_DAYS_IN_JUNE = 30;
const DAYS_PASSED = 18; // 1 June through 18 June inclusive
const DAYS_REMAINING = TOTAL_DAYS_IN_JUNE - DAYS_PASSED; // 12

const EXCLUSIONS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

function isExcluded(campaignName: string) {
  const lower = (campaignName || '').toLowerCase();
  return EXCLUSIONS.some(ex => lower.includes(ex));
}

export async function GET() {
  try {
    // Run all period queries + the dedicated MTD query for Est. Spends
    const periodPromises = DATE_RANGES.map(async (range) => {
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

    const mtdPromise = (async () => {
      const gaql = `
        SELECT segments.product_title, campaign.name, 
        campaign.advertising_channel_type, metrics.cost_micros
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${MTD_START}' AND '${MTD_END}'
        AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
      `;
      const data = await queryAllGoogleAdsAccounts(gaql);
      return { key: 'mtd', data };
    })();

    const results = await Promise.all([...periodPromises, mtdPromise]);

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
        const jun16 = spends['jun16'] || 0;
        const jun17 = spends['jun17'] || 0;
        const jun18 = spends['jun18'] || 0;
        const mtd = spends['mtd'] || 0; // 1 June - 18 June

        const catMar = categoryTotals[category]['mar'] || 1;
        const catApr = categoryTotals[category]['apr'] || 1;
        const catMay = categoryTotals[category]['may'] || 1;
        const catJun1_15 = categoryTotals[category]['jun1_15'] || 1;
        const catJun16 = categoryTotals[category]['jun16'] || 1;
        const catJun17 = categoryTotals[category]['jun17'] || 1;
        const catJun18 = categoryTotals[category]['jun18'] || 1;

        // Est. Spends = MTD (1-18 June) + (18 June spend * Days Remaining in month)
        const estSpends = mtd + (jun18 * DAYS_REMAINING);

        productArr.push({
          name: productName,
          mar, apr, may, jun1_15, jun16, jun17, jun18,
          salienceMar: (mar / catMar) * 100,
          salienceApr: (apr / catApr) * 100,
          salienceMay: (may / catMay) * 100,
          salienceJun1_15: (jun1_15 / catJun1_15) * 100,
          salienceJun16: (jun16 / catJun16) * 100,
          salienceJun17: (jun17 / catJun17) * 100,
          salienceJun18: (jun18 / catJun18) * 100,
          mtd,
          estSpends,
        });
      }

      // Sort by most recent day (18 June) descending
      productArr.sort((a, b) => b.jun18 - a.jun18);
      outputCategories[category] = { products: productArr };
    }

    const dateRangesMap: Record<string, any> = {};
    DATE_RANGES.forEach(r => { dateRangesMap[r.key] = { start: r.start, end: r.end }; });
    dateRangesMap['mtd'] = { start: MTD_START, end: MTD_END };

    return NextResponse.json({
      categories: outputCategories,
      dateRanges: dateRangesMap,
      daysRemaining: DAYS_REMAINING,
      daysPassed: DAYS_PASSED,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
