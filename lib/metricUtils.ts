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
    campaign: { contains: 'chair', excludes: ['boost', 'growth', 'all_products', 'dhoni', 'desk', 'sofa'] },
    adset:    { excludes: ['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'] },
  },
  'Desk': {
    campaign: { contains: 'desk', excludes: ['boost', 'growth', 'chair', 'sofa', 'all_products', 'dhoni'] },
    adset:    { excludes: ['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'] },
  },
  'Sofa': {
    campaign: { contains: 'sofa',  excludes: ['boost', 'growth', 'chair', 'desk', 'all_products', 'dhoni'] },
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

export function matchesCategoryForMetrics(
  campaignName: string,
  adsetName: string,
  category: string
): boolean {
  const cn = (campaignName || '').toLowerCase();
  const an = (adsetName    || '').toLowerCase();
  const rule = CATEGORY_RULES[category];
  if (!rule) return false;

  const isAllProducts = cn.includes('all_products');
  const isMattress = cn.includes('mat') || cn.includes('dhoni');

  // STEP 1: Campaign exclusions are ALWAYS applied
  for (const exc of rule.campaign.excludes) {
    if (cn.includes(exc)) return false;
  }

  // STEP 2: Adset exclusions (bypassed if campaign explicitly claims the category)
  let skipAdsetExcludes = false;
  if (category === 'Mattress' && (isAllProducts || cn.includes('dhoni'))) {
      skipAdsetExcludes = true;
  }
  if (category === 'Chair' && cn.includes('chair')) {
      skipAdsetExcludes = true;
  }
  if (category === 'Desk' && cn.includes('desk')) {
      skipAdsetExcludes = true;
  }
  if (category === 'Sofa' && cn.includes('sofa')) {
      skipAdsetExcludes = true;
  }

  if (!skipAdsetExcludes) {
    for (const exc of rule.adset.excludes) {
      if (an.includes(exc)) return false;
    }
  }

  if (category === 'All') return true;

  // STEP 3: Does the adset explicitly contain the product keyword?
  const keyword = getCategoryKeyword(category);
  if (keyword && an.includes(keyword)) {
    return true;
  }

  // STEP 4: Does the campaign explicitly contain the category keyword?
  if (category === 'Mattress' && isMattress) {
    return true;
  }
  if (category !== 'Mattress' && rule.campaign.contains && cn.includes(rule.campaign.contains)) {
    return true;
  }

  return false;
}

export function classifyFunnel(campaignName: string): 'TOP' | 'MID' | 'BOTTOM' | 'GROWTH' | null {
  const n = (campaignName || '').toLowerCase();

  // GROWTH: contains 'growth' — highest priority, checked first
  if (n.includes('growth')) return 'GROWTH';

  // BOTTOM: contains 'bot', doesn't contain 'growth'
  if (n.includes('bot') && !n.includes('growth')) return 'BOTTOM';

  // MID: contains 'mid', doesn't contain 'growth'
  if (n.includes('mid') && !n.includes('growth')) return 'MID';

  // TOP: doesn't contain 'mid', doesn't contain 'bot'
  if (!n.includes('mid') && !n.includes('bot')) return 'TOP';

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
