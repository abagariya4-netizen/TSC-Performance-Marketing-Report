import { NextResponse } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { PRODUCT_TITLE_MAP, getCleanProductName } from '@/lib/productTitleMap';
import { PRODUCT_CATEGORY_MAP, getCategoryForProduct } from '@/lib/productCategoryMap';

export const dynamic = 'force-dynamic';

const EXCLUSIONS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

function isExcluded(campaignName: string) {
  const lower = (campaignName || '').toLowerCase();
  return EXCLUSIONS.some(ex => lower.includes(ex));
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function getDaysInMonth(year: number, month: number): number {
  // month is 0-indexed (0=Jan)
  return new Date(year, month + 1, 0).getDate();
}

export async function GET() {
  try {
    // Dynamic date calculation based on actual current date
    const now = new Date();
    const yesterday = addDays(now, -1); // "yesterday relative to today"

    const yesterdayStr = formatDate(yesterday);
    const day1Before = formatDate(addDays(yesterday, -1)); // 2 days ago
    const day2Before = formatDate(addDays(yesterday, -2)); // 3 days ago

    const currentMonthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    const currentMonthStartStr = formatDate(currentMonthStart);

    const totalDaysInMonth = getDaysInMonth(yesterday.getFullYear(), yesterday.getMonth());
    const daysPassed = yesterday.getDate(); // e.g. 18 if yesterday = 18th
    const daysRemaining = totalDaysInMonth - daysPassed;

    // First 15 days of current month (or up to yesterday if month just started)
    const first15End = new Date(yesterday.getFullYear(), yesterday.getMonth(), Math.min(15, daysPassed));
    const first15EndStr = formatDate(first15End);

    // Previous 3 full months (rolling, relative to current month)
    const month1 = new Date(yesterday.getFullYear(), yesterday.getMonth() - 3, 1);
    const month1End = new Date(yesterday.getFullYear(), yesterday.getMonth() - 2, 0);
    const month2 = new Date(yesterday.getFullYear(), yesterday.getMonth() - 2, 1);
    const month2End = new Date(yesterday.getFullYear(), yesterday.getMonth() - 1, 0);
    const month3 = new Date(yesterday.getFullYear(), yesterday.getMonth() - 1, 1);
    const month3End = new Date(yesterday.getFullYear(), yesterday.getMonth(), 0);

    const DATE_RANGES = [
      { key: 'month1', start: formatDate(month1), end: formatDate(month1End) },
      { key: 'month2', start: formatDate(month2), end: formatDate(month2End) },
      { key: 'month3', start: formatDate(month3), end: formatDate(month3End) },
      { key: 'curMonthFirst15', start: currentMonthStartStr, end: first15EndStr },
      { key: 'day3', start: day2Before, end: day2Before },
      { key: 'day2', start: day1Before, end: day1Before },
      { key: 'day1', start: yesterdayStr, end: yesterdayStr }, // most recent = "yesterday"
    ];

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
        WHERE segments.date BETWEEN '${currentMonthStartStr}' AND '${yesterdayStr}'
        AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
      `;
      const data = await queryAllGoogleAdsAccounts(gaql);
      return { key: 'mtd', data };
    })();

    const results = await Promise.all([...periodPromises, mtdPromise]);

    const productSpends: Record<string, Record<string, Record<string, number>>> = {};
    const categoryTotals: Record<string, Record<string, number>> = {};

    // Pre-fill all known products with 0 spend so they always appear in their category
    const allKnownCleanNames = Array.from(new Set([
      ...Object.values(PRODUCT_TITLE_MAP),
      ...Object.keys(PRODUCT_CATEGORY_MAP)
    ]));
    
    allKnownCleanNames.forEach(cleanName => {
      const category = getCategoryForProduct(cleanName);
      if (!productSpends[category]) productSpends[category] = {};
      if (!productSpends[category][cleanName]) {
        productSpends[category][cleanName] = { mar: 0, apr: 0, may: 0, jun1_15: 0, junLast3: 0 };
      }
      if (!categoryTotals[category]) {
        categoryTotals[category] = { mar: 0, apr: 0, may: 0, jun1_15: 0, junLast3: 0 };
      }
    });

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
        const month1Spend = spends['month1'] || 0;
        const month2Spend = spends['month2'] || 0;
        const month3Spend = spends['month3'] || 0;
        const curMonthFirst15 = spends['curMonthFirst15'] || 0;
        const day3 = spends['day3'] || 0;
        const day2 = spends['day2'] || 0;
        const day1 = spends['day1'] || 0; // most recent day = "yesterday"
        const mtd = spends['mtd'] || 0;

        const catMonth1 = categoryTotals[category]['month1'] || 1;
        const catMonth2 = categoryTotals[category]['month2'] || 1;
        const catMonth3 = categoryTotals[category]['month3'] || 1;
        const catCurFirst15 = categoryTotals[category]['curMonthFirst15'] || 1;
        const catDay3 = categoryTotals[category]['day3'] || 1;
        const catDay2 = categoryTotals[category]['day2'] || 1;
        const catDay1 = categoryTotals[category]['day1'] || 1;

        // Est. Spends = MTD (1st of month to yesterday) + (yesterday's spend * Days Remaining)
        const estSpends = mtd + (day1 * daysRemaining);

        const avg3Months = (month1Spend + month2Spend + month3Spend) / 3;
        const vsAvg3Months = avg3Months > 0 ? ((estSpends - avg3Months) / avg3Months) * 100 : null;
        const vsLastMonth = month3Spend > 0 ? ((estSpends - month3Spend) / month3Spend) * 100 : null;

        productArr.push({
          name: productName,
          month1: month1Spend, month2: month2Spend, month3: month3Spend,
          curMonthFirst15,
          day3, day2, day1,
          salienceMonth1: (month1Spend / catMonth1) * 100,
          salienceMonth2: (month2Spend / catMonth2) * 100,
          salienceMonth3: (month3Spend / catMonth3) * 100,
          salienceCurFirst15: (curMonthFirst15 / catCurFirst15) * 100,
          salienceDay3: (day3 / catDay3) * 100,
          salienceDay2: (day2 / catDay2) * 100,
          salienceDay1: (day1 / catDay1) * 100,
          mtd,
          estSpends,
          vsAvg3Months,
          vsLastMonth,
        });
      }

      // Sort by most recent day descending
      productArr.sort((a, b) => b.day1 - a.day1);
      outputCategories[category] = { products: productArr };
    }

    const dateRangesMap: Record<string, any> = {};
    DATE_RANGES.forEach(r => { dateRangesMap[r.key] = { start: r.start, end: r.end }; });
    dateRangesMap['mtd'] = { start: currentMonthStartStr, end: yesterdayStr };

    // Human-readable labels for the frontend
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels = {
      month1: monthNames[month1.getMonth()],
      month2: monthNames[month2.getMonth()],
      month3: monthNames[month3.getMonth()],
      curMonthFirst15: `${monthNames[currentMonthStart.getMonth()]}(1-${Math.min(15, daysPassed)})`,
      day3: `${day2Before.split('-')[2]} ${monthNames[new Date(day2Before).getMonth()]}`,
      day2: `${day1Before.split('-')[2]} ${monthNames[new Date(day1Before).getMonth()]}`,
      day1: `${yesterdayStr.split('-')[2]} ${monthNames[yesterday.getMonth()]}`,
      lastMonth: monthNames[month3.getMonth()],
    };

    return NextResponse.json({
      categories: outputCategories,
      dateRanges: dateRangesMap,
      daysRemaining,
      daysPassed,
      labels,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
