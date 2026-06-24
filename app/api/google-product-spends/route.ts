import { NextResponse, NextRequest } from 'next/server';
import { queryAllGoogleAdsAccounts } from '@/lib/googleAdsAuth';
import { PRODUCT_TITLE_MAP, getCleanProductName } from '@/lib/productTitleMap';
import { PRODUCT_CATEGORY_MAP, getCategoryForProduct } from '@/lib/productCategoryMap';

export const dynamic = 'force-dynamic';

const EXCLUSIONS = ['vvc', 'r&f', 'foc', 'growth', 'vrc', 'rnf'];

function isExcluded(campaignName: string) {
  const lower = (campaignName || '').toLowerCase();
  return EXCLUSIONS.some(ex => lower.includes(ex));
}

function getCategoryFromCampaign(campaignName: string): string {
  const lower = (campaignName || '').toLowerCase();
  if (lower.includes('chair')) return 'Chair';
  if (lower.includes('desk')) return 'Desk';
  if (lower.includes('elite')) return 'Elite';
  if (lower.includes('sofa')) return 'Sofa';
  if (lower.includes('foot') || lower.includes('massager')) return 'Foot Massager';
  if (lower.includes('accessories') || lower.includes('pillow') || lower.includes('cushion') || lower.includes('protector') || lower.includes('bedsheet') || lower.includes('comforter')) return 'Accessories';
  if (lower.includes('bed')) return 'Bed';
  // Generic campaigns default to Mattress
  return 'Mattress';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endDateStrParam = searchParams.get('endDate');

    let yesterday: Date;
    let now = new Date();
    
    if (endDateStrParam) {
      yesterday = new Date(endDateStrParam);
    } else {
      yesterday = addDays(now, -1);
    }

    const yesterdayStr = formatDate(yesterday);
    const day1Before = formatDate(addDays(yesterday, -1)); // 2 days ago
    const day2Before = formatDate(addDays(yesterday, -2)); // 3 days ago

    const currentMonthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    const currentMonthStartStr = formatDate(currentMonthStart);

    const totalDaysInMonth = getDaysInMonth(yesterday.getFullYear(), yesterday.getMonth());
    const daysPassed = yesterday.getDate(); // e.g. 18 if yesterday = 18th
    const daysRemaining = totalDaysInMonth - daysPassed;

    // Up to yesterday for current month
    const curMonthEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), Math.max(1, daysPassed));
    const curMonthEndStr = formatDate(curMonthEnd);

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
      { key: 'curMonthFirst15', start: currentMonthStartStr, end: curMonthEndStr },
      { key: 'day3', start: day2Before, end: day2Before },
      { key: 'day2', start: day1Before, end: day1Before },
      { key: 'day1', start: yesterdayStr, end: yesterdayStr }, // most recent = "yesterday"
    ];

    const periodPromises = DATE_RANGES.map(async (range) => {
      const gaql = `
        SELECT segments.product_item_id, segments.product_title, campaign.name, 
        campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions_value
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
        AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
      `;
      const data = await queryAllGoogleAdsAccounts(gaql);
      return { key: range.key, data };
    });

    const mtdPromise = (async () => {
      const gaql = `
        SELECT segments.product_item_id, segments.product_title, campaign.name, 
        campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions_value
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${currentMonthStartStr}' AND '${yesterdayStr}'
        AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')
      `;
      const data = await queryAllGoogleAdsAccounts(gaql);
      return { key: 'mtd', data };
    })();

    const results = await Promise.all([...periodPromises, mtdPromise]);

    const productData: Record<string, Record<string, {
      spends: Record<string, number>,
      clicks: Record<string, number>,
      impressions: Record<string, number>,
      cv: Record<string, number>,
      variants: Record<string, {
        spends: Record<string, number>,
        clicks: Record<string, number>,
        impressions: Record<string, number>,
        cv: Record<string, number>
      }>
    }>> = {};
    const categoryTotals: Record<string, Record<string, { spend: number, clicks: number, impressions: number, cv: number }>> = {};

    results.forEach(({ key, data }) => {
      data.forEach((row: any) => {
        const campaignName = row.campaign?.name || '';
        if (isExcluded(campaignName)) return;

        const rawTitle = row.segments?.productTitle || 'Unknown';
        const variantId = row.segments?.productItemId || row.segments?.productTitle || 'Unknown Variant';
        const cost = Number(row.metrics?.costMicros || 0) / 1000000;
        const clicks = Number(row.metrics?.clicks || 0);
        const impressions = Number(row.metrics?.impressions || 0);
        const cv = Number(row.metrics?.conversionsValue || 0);

        const cleanName = getCleanProductName(rawTitle);
        const campaignCategory = getCategoryFromCampaign(campaignName);
        
        const category = campaignCategory;

        if (!categoryTotals[category]) categoryTotals[category] = {};
        if (!categoryTotals[category][key]) categoryTotals[category][key] = { spend: 0, clicks: 0, impressions: 0, cv: 0 };
        categoryTotals[category][key].spend += cost;
        categoryTotals[category][key].clicks += clicks;
        categoryTotals[category][key].impressions += impressions;
        categoryTotals[category][key].cv += cv;

        if (!productData[category]) productData[category] = {};
        if (!productData[category][cleanName]) productData[category][cleanName] = {
          spends: {}, clicks: {}, impressions: {}, cv: {}, variants: {}
        };
        const pNode = productData[category][cleanName];
        
        pNode.spends[key] = (pNode.spends[key] || 0) + cost;
        pNode.clicks[key] = (pNode.clicks[key] || 0) + clicks;
        pNode.impressions[key] = (pNode.impressions[key] || 0) + impressions;
        pNode.cv[key] = (pNode.cv[key] || 0) + cv;

        if (!pNode.variants[variantId]) pNode.variants[variantId] = { spends: {}, clicks: {}, impressions: {}, cv: {} };
        const vNode = pNode.variants[variantId];
        vNode.spends[key] = (vNode.spends[key] || 0) + cost;
        vNode.clicks[key] = (vNode.clicks[key] || 0) + clicks;
        vNode.impressions[key] = (vNode.impressions[key] || 0) + impressions;
        vNode.cv[key] = (vNode.cv[key] || 0) + cv;
      });
    });

    const outputCategories: any = {};

    for (const [category, products] of Object.entries(productData)) {
      const productArr = [];
      for (const [productName, pNode] of Object.entries(products)) {
        const mapMetrics = (node: any, isCat = false) => {
          const metrics: any = {};
          ['month1', 'month2', 'month3', 'curMonthFirst15', 'day3', 'day2', 'day1', 'mtd'].forEach(k => {
             const spend = isCat ? (node[k]?.spend || 0) : (node.spends[k] || 0);
             const clicks = isCat ? (node[k]?.clicks || 0) : (node.clicks[k] || 0);
             const impr = isCat ? (node[k]?.impressions || 0) : (node.impressions[k] || 0);
             const cv = isCat ? (node[k]?.cv || 0) : (node.cv[k] || 0);
             
             metrics[k] = {
               spend,
               cpc: clicks > 0 ? spend / clicks : 0,
               ctr: impr > 0 ? (clicks / impr) * 100 : 0,
               roas: spend > 0 ? cv / spend : 0
             };
          });
          return metrics;
        };

        const pMetrics = mapMetrics(pNode);
        const catNode = categoryTotals[category] || {};
        const catMetrics = mapMetrics(catNode, true);

        const estSpends = pMetrics.mtd.spend + (pMetrics.day1.spend * daysRemaining);
        const avg3Months = (pMetrics.month1.spend + pMetrics.month2.spend + pMetrics.month3.spend) / 3;
        const vsAvg3Months = avg3Months > 0 ? ((estSpends - avg3Months) / avg3Months) * 100 : null;
        const vsLastMonth = pMetrics.month3.spend > 0 ? ((estSpends - pMetrics.month3.spend) / pMetrics.month3.spend) * 100 : null;

        const variantsArr = Object.entries(pNode.variants).map(([vId, vNode]) => {
           const vM = mapMetrics(vNode);
           return {
             name: vId,
             metrics: vM,
             salienceMonth1: pMetrics.month1.spend > 0 ? (vM.month1.spend / pMetrics.month1.spend) * 100 : 0,
             salienceMonth2: pMetrics.month2.spend > 0 ? (vM.month2.spend / pMetrics.month2.spend) * 100 : 0,
             salienceMonth3: pMetrics.month3.spend > 0 ? (vM.month3.spend / pMetrics.month3.spend) * 100 : 0,
             salienceCurFirst15: pMetrics.curMonthFirst15.spend > 0 ? (vM.curMonthFirst15.spend / pMetrics.curMonthFirst15.spend) * 100 : 0,
             salienceDay3: pMetrics.day3.spend > 0 ? (vM.day3.spend / pMetrics.day3.spend) * 100 : 0,
             salienceDay2: pMetrics.day2.spend > 0 ? (vM.day2.spend / pMetrics.day2.spend) * 100 : 0,
             salienceDay1: pMetrics.day1.spend > 0 ? (vM.day1.spend / pMetrics.day1.spend) * 100 : 0,
           };
        });

        variantsArr.sort((a, b) => {
           const tA = a.metrics.month1.spend + a.metrics.month2.spend + a.metrics.month3.spend + a.metrics.mtd.spend;
           const tB = b.metrics.month1.spend + b.metrics.month2.spend + b.metrics.month3.spend + b.metrics.mtd.spend;
           return tB - tA;
        });

        productArr.push({
          name: productName,
          month1: pMetrics.month1.spend, month2: pMetrics.month2.spend, month3: pMetrics.month3.spend,
          curMonthFirst15: pMetrics.curMonthFirst15.spend,
          day3: pMetrics.day3.spend, day2: pMetrics.day2.spend, day1: pMetrics.day1.spend, mtd: pMetrics.mtd.spend,
          cpcMonth1: pMetrics.month1.cpc, ctrMonth1: pMetrics.month1.ctr, roasMonth1: pMetrics.month1.roas,
          cpcMonth2: pMetrics.month2.cpc, ctrMonth2: pMetrics.month2.ctr, roasMonth2: pMetrics.month2.roas,
          cpcMonth3: pMetrics.month3.cpc, ctrMonth3: pMetrics.month3.ctr, roasMonth3: pMetrics.month3.roas,
          cpcCurMonth: pMetrics.curMonthFirst15.cpc, ctrCurMonth: pMetrics.curMonthFirst15.ctr, roasCurMonth: pMetrics.curMonthFirst15.roas,
          salienceMonth1: catMetrics.month1.spend > 0 ? (pMetrics.month1.spend / catMetrics.month1.spend) * 100 : 0,
          salienceMonth2: catMetrics.month2.spend > 0 ? (pMetrics.month2.spend / catMetrics.month2.spend) * 100 : 0,
          salienceMonth3: catMetrics.month3.spend > 0 ? (pMetrics.month3.spend / catMetrics.month3.spend) * 100 : 0,
          salienceCurFirst15: catMetrics.curMonthFirst15.spend > 0 ? (pMetrics.curMonthFirst15.spend / catMetrics.curMonthFirst15.spend) * 100 : 0,
          salienceDay3: catMetrics.day3.spend > 0 ? (pMetrics.day3.spend / catMetrics.day3.spend) * 100 : 0,
          salienceDay2: catMetrics.day2.spend > 0 ? (pMetrics.day2.spend / catMetrics.day2.spend) * 100 : 0,
          salienceDay1: catMetrics.day1.spend > 0 ? (pMetrics.day1.spend / catMetrics.day1.spend) * 100 : 0,
          estSpends,
          vsAvg3Months,
          vsLastMonth,
          variants: variantsArr.map(v => ({
            name: v.name,
            month1: v.metrics.month1.spend, month2: v.metrics.month2.spend, month3: v.metrics.month3.spend,
            curMonthFirst15: v.metrics.curMonthFirst15.spend,
            day3: v.metrics.day3.spend, day2: v.metrics.day2.spend, day1: v.metrics.day1.spend, mtd: v.metrics.mtd.spend,
            cpcMonth1: v.metrics.month1.cpc, ctrMonth1: v.metrics.month1.ctr, roasMonth1: v.metrics.month1.roas,
            cpcMonth2: v.metrics.month2.cpc, ctrMonth2: v.metrics.month2.ctr, roasMonth2: v.metrics.month2.roas,
            cpcMonth3: v.metrics.month3.cpc, ctrMonth3: v.metrics.month3.ctr, roasMonth3: v.metrics.month3.roas,
            cpcCurMonth: v.metrics.curMonthFirst15.cpc, ctrCurMonth: v.metrics.curMonthFirst15.ctr, roasCurMonth: v.metrics.curMonthFirst15.roas,
            salienceMonth1: v.salienceMonth1, salienceMonth2: v.salienceMonth2, salienceMonth3: v.salienceMonth3,
            salienceCurFirst15: v.salienceCurFirst15,
            salienceDay3: v.salienceDay3, salienceDay2: v.salienceDay2, salienceDay1: v.salienceDay1
          }))
        });
      }

      productArr.sort((a, b) => {
        const totalA = a.month1 + a.month2 + a.month3 + a.mtd;
        const totalB = b.month1 + b.month2 + b.month3 + b.mtd;
        return totalB - totalA;
      });
      
      const catTotals = categoryTotals[category] || {};
      const catMetrics = {
        month1: { spend: catTotals['month1']?.spend || 0, clicks: catTotals['month1']?.clicks || 0, impr: catTotals['month1']?.impressions || 0, cv: catTotals['month1']?.cv || 0 },
        month2: { spend: catTotals['month2']?.spend || 0, clicks: catTotals['month2']?.clicks || 0, impr: catTotals['month2']?.impressions || 0, cv: catTotals['month2']?.cv || 0 },
        month3: { spend: catTotals['month3']?.spend || 0, clicks: catTotals['month3']?.clicks || 0, impr: catTotals['month3']?.impressions || 0, cv: catTotals['month3']?.cv || 0 },
        curMonth: { spend: catTotals['curMonthFirst15']?.spend || 0, clicks: catTotals['curMonthFirst15']?.clicks || 0, impr: catTotals['curMonthFirst15']?.impressions || 0, cv: catTotals['curMonthFirst15']?.cv || 0 },
        day3: { spend: catTotals['day3']?.spend || 0 },
        day2: { spend: catTotals['day2']?.spend || 0 },
        day1: { spend: catTotals['day1']?.spend || 0 },
        mtd: { spend: catTotals['mtd']?.spend || 0 },
      };

      const estCatSpends = catMetrics.mtd.spend + (catMetrics.day1.spend * daysRemaining);
      const avgCat3 = (catMetrics.month1.spend + catMetrics.month2.spend + catMetrics.month3.spend) / 3;

      outputCategories[category] = { 
        products: productArr,
        totals: {
          month1: catMetrics.month1.spend,
          month2: catMetrics.month2.spend,
          month3: catMetrics.month3.spend,
          curMonthFirst15: catMetrics.curMonth.spend,
          day3: catMetrics.day3.spend,
          day2: catMetrics.day2.spend,
          day1: catMetrics.day1.spend,
          mtd: catMetrics.mtd.spend,
          cpcMonth1: catMetrics.month1.clicks > 0 ? catMetrics.month1.spend / catMetrics.month1.clicks : 0,
          ctrMonth1: catMetrics.month1.impr > 0 ? (catMetrics.month1.clicks / catMetrics.month1.impr) * 100 : 0,
          roasMonth1: catMetrics.month1.spend > 0 ? catMetrics.month1.cv / catMetrics.month1.spend : 0,
          cpcMonth2: catMetrics.month2.clicks > 0 ? catMetrics.month2.spend / catMetrics.month2.clicks : 0,
          ctrMonth2: catMetrics.month2.impr > 0 ? (catMetrics.month2.clicks / catMetrics.month2.impr) * 100 : 0,
          roasMonth2: catMetrics.month2.spend > 0 ? catMetrics.month2.cv / catMetrics.month2.spend : 0,
          cpcMonth3: catMetrics.month3.clicks > 0 ? catMetrics.month3.spend / catMetrics.month3.clicks : 0,
          ctrMonth3: catMetrics.month3.impr > 0 ? (catMetrics.month3.clicks / catMetrics.month3.impr) * 100 : 0,
          roasMonth3: catMetrics.month3.spend > 0 ? catMetrics.month3.cv / catMetrics.month3.spend : 0,
          cpcCurMonth: catMetrics.curMonth.clicks > 0 ? catMetrics.curMonth.spend / catMetrics.curMonth.clicks : 0,
          ctrCurMonth: catMetrics.curMonth.impr > 0 ? (catMetrics.curMonth.clicks / catMetrics.curMonth.impr) * 100 : 0,
          roasCurMonth: catMetrics.curMonth.spend > 0 ? catMetrics.curMonth.cv / catMetrics.curMonth.spend : 0,
          estSpends: estCatSpends,
          vsAvg3Months: avgCat3 > 0 ? ((estCatSpends - avgCat3) / avgCat3) * 100 : null,
          vsLastMonth: catMetrics.month3.spend > 0 ? ((estCatSpends - catMetrics.month3.spend) / catMetrics.month3.spend) * 100 : null,
        }
      };
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
      curMonthFirst15: `${monthNames[currentMonthStart.getMonth()].toUpperCase()} (1-${daysPassed})`,
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
