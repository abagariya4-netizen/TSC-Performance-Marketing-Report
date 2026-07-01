import { fmtDate } from './dateUtils';

// Standard exclusions applied to ALL categories always
const ALWAYS_EXCLUDE = ['boost', 'growth'];

export const CATEGORY_RULES: Record<string, {
  campaign: { contains?: string; excludes: string[] };
  adset:    { excludes: string[] };
}> = {
  'All': {
    campaign: { excludes: ['boost', 'growth'] },
    adset:    { excludes: ['boost', 'growth'] },
  },
  'Mattress': {
    campaign: {
      contains: 'mat',
      excludes: [
        'sofa', 'desk', 'elite', 'foot', 'bed', 'acce',
        'chair', 'pillow', 'cushion', 'massa', 'sensai',
        'boost', 'growth'
      ]
    },
    adset: { excludes: ['sofa', 'desk', 'chair', 'boost', 'growth'] },
  },
  'Chair': {
    campaign: { contains: 'chair', excludes: ['boost', 'growth', 'desk', 'sofa'] },
    adset:    { excludes: ['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'] },
  },
  'Desk': {
    campaign: { contains: 'desk', excludes: ['boost', 'growth', 'chair', 'sofa'] },
    adset:    { excludes: ['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'] },
  },
  'Sofa': {
    campaign: { contains: 'sofa',  excludes: ['boost', 'growth', 'chair', 'desk'] },
    adset:    { excludes: ['mattress', 'mat', 'desk', 'chair', 'boost', 'growth'] },
  },
  'Elite': {
    campaign: { contains: 'elite', excludes: ['boost', 'growth'] },
    adset:    { excludes: ['boost', 'growth'] },
  },
  'Foot Massager': {
    campaign: { contains: 'foot',  excludes: ['boost', 'growth'] },
    adset:    { excludes: ['boost', 'growth'] },
  },
  'Accessories': {
    campaign: { contains: 'acce',  excludes: ['boost', 'growth'] },
    adset:    { excludes: ['boost', 'growth'] },
  },
  'Bed': {
    campaign: { contains: 'bed',   excludes: ['boost', 'growth'] },
    adset:    { excludes: ['boost', 'growth'] },
  },
};

export const FUNNELS = ['TOP', 'MID', 'BOTTOM', 'GROWTH'] as const;
export type Funnel = typeof FUNNELS[number];

export function matchesCategory(campaignName: string, adsetName: string, category: string): boolean {
  const cn = (campaignName || '').toLowerCase();
  const an = (adsetName   || '').toLowerCase();
  const rule = CATEGORY_RULES[category];
  if (!rule) return false;

  if (rule.campaign.contains && !cn.includes(rule.campaign.contains)) return false;
  for (const exc of rule.campaign.excludes) {
    if (cn.includes(exc)) return false;
  }

  for (const exc of rule.adset.excludes) {
    if (an.includes(exc)) return false;
  }

  return true;
}

// Maps each category to its product keyword for adset matching
function getCategoryKeyword(category: string): string | null {
  const map: Record<string, string> = {
    'Mattress':     'mat',
    'Chair':        'chair',
    'Sofa':         'sofa',
    'Desk':         'desk',
    'Foot Massager':'foot',
    'Elite':        'elite',
    'Accessories':  'acce',
    'Bed':          'bed',
  };
  return map[category] || null;
}

export function matchesCategoryForMetrics(campaignName: string, adsetName: string, category: string): boolean {
  const cn = (campaignName || '').toLowerCase();
  const an = (adsetName || '').toLowerCase();
  const isGrowth = classifyFunnel(campaignName) === 'GROWTH';
  
  let matchedCategory: string | null = null;
  
  if (isGrowth) {
    const str = cn;
    if (str.includes('chair')) matchedCategory = 'Chair';
    else if (str.includes('desk')) matchedCategory = 'Desk';
    else if (str.includes('sofa')) matchedCategory = 'Sofa';
    else if (str.includes('elite')) matchedCategory = 'Elite';
    else if (str.includes('foot')) matchedCategory = 'Foot Massager';
    else if (str.includes('bed')) matchedCategory = 'Bed';
    else if (str.includes('acce')) matchedCategory = 'Accessories';
    else matchedCategory = 'Mattress';
  } else {
    const str = cn + " " + an;
    if (cn.includes('mat') || cn.includes('mattress')) {
      matchedCategory = 'Mattress';
    } else {
      if (str.includes('chair')) matchedCategory = 'Chair';
      else if (str.includes('desk')) matchedCategory = 'Desk';
      else if (str.includes('sofa')) matchedCategory = 'Sofa';
      else if (str.includes('elite')) matchedCategory = 'Elite';
      else if (str.includes('foot')) matchedCategory = 'Foot Massager';
      else if (str.includes('bed')) matchedCategory = 'Bed';
      else if (str.includes('acce')) matchedCategory = 'Accessories';
      else if (str.includes('dhoni') || str.includes('all_products') || str.includes('mat') || str.includes('mattress')) matchedCategory = 'Mattress';
      else matchedCategory = 'Mattress'; // Everything else defaults to Mattress
    }
  }

  if (category === 'All') return matchedCategory !== null;
  return matchedCategory === category;
}

export function classifyFunnel(campaignName: string): 'TOP' | 'MID' | 'BOTTOM' | 'GROWTH' | null {
  const n = (campaignName || '').toLowerCase();

  // GROWTH: contains 'growth' — highest priority, checked first
  if (n.includes('growth')) return 'GROWTH';

  // BOTTOM: contains 'bot', doesn't contain 'growth'
  if (n.includes('bot') && !n.includes('growth')) return 'BOTTOM';

  // MID: contains 'mid', doesn't contain 'growth'
  if (n.includes('mid') && !n.includes('growth')) return 'MID';

  // TOP: contains 'top', doesn't contain 'growth'
  if (n.includes('top') && !n.includes('growth')) return 'TOP';

  return null;
}

export function calcLCtoLP(lp: number, lc: number): number | null {
  if (lc === 0) return null;
  return Math.round((lp / lc) * 10000) / 100;
}

export function calcCPM(spend: number, impressions: number): number | null {
  if (impressions === 0) return null;
  return Math.round((spend / impressions) * 1000 * 100) / 100;
}

export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function calcComparisons(
  months: string[],
  currentMonth: string,
  metricByMonth: Record<string, number | null>
) {
  const currentVal = metricByMonth[currentMonth] ?? null;

  const idx = months.indexOf(currentMonth);
  const prevMonth = idx > 0 ? months[idx - 1] : null;
  const prevVal   = prevMonth ? (metricByMonth[prevMonth] ?? null) : null;
  const vsLastMonth = pctChange(currentVal, prevVal);

  const last3Months = months.slice(Math.max(0, idx - 3), idx);
  const last3Vals   = last3Months
    .map(m => metricByMonth[m])
    .filter((v): v is number => v != null);
  const avg3 = last3Vals.length > 0
    ? last3Vals.reduce((s, v) => s + v, 0) / last3Vals.length
    : null;
  const vsAvg3 = pctChange(currentVal, avg3);

  return { vsLastMonth, vsAvg3 };
}

export function calcLast7Days(
  dailyData: Record<string, any>,
  metricFn: (period: string) => number | null
): number | null {
  const today     = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yStr      = fmtDate(yesterday);

  const ydayVal = metricFn(yStr);

  const last7: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const d    = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - i);
    const dStr = fmtDate(d);
    const val  = metricFn(dStr);
    if (val != null) last7.push(val);
  }

  const avg7 = last7.length > 0
    ? last7.reduce((s, v) => s + v, 0) / last7.length
    : null;

  return pctChange(ydayVal, avg7);
}

export function getDefaultDateRange() {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  return {
    since: fmtDate(startOfMonth),
    until: fmtDate(yesterday)
  };
}
