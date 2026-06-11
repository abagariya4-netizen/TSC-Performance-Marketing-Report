import { fmtDate } from './dateUtils';

// Standard exclusions applied to ALL categories always
const ALWAYS_EXCLUDE = ['boost', 'growth'];

// Per-category filter rules
export const CATEGORY_RULES: Record<string, { contains?: string; excludes: string[] }> = {
  'All': {
    excludes: ['boost', 'growth']
  },
  'Mattress': {
    contains: 'mat',
    excludes: ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai','boost','growth']
  },
  'Sofa': {
    contains: 'sofa',
    excludes: ['boost','growth']
  },
  'Desk': {
    contains: 'desk',
    excludes: ['boost','growth']
  },
  'Chair': {
    contains: 'chair',
    excludes: ['boost','growth']
  },
  'Elite': {
    contains: 'elite',
    excludes: ['boost','growth']
  },
  'Foot Massager': {
    contains: 'foot',
    excludes: ['boost','growth']
  },
  'Accessories': {
    contains: 'acce',
    excludes: ['boost','growth']
  },
  'Bed': {
    contains: 'bed',
    excludes: ['boost','growth']
  },
};

// Funnel filter rules (applied ON TOP of category filter)
export const FUNNEL_RULES: Record<string, { contains?: string; excludes: string[] }> = {
  'All':    { excludes: [] },
  'Top':    { excludes: ['mid','bot'] },
  'Mid':    { contains: 'mid', excludes: ['growth'] },
  'Bottom': { contains: 'bot', excludes: ['growth'] },
  'Growth': { contains: 'growth', excludes: [] },
};

export function matchesCampaign(
  campaignName: string,
  category: string,
  funnel: string
): boolean {
  const n = campaignName.toLowerCase();

  // Apply category rules
  const catRule = CATEGORY_RULES[category];
  if (!catRule) return false;
  if (catRule.contains && !n.includes(catRule.contains)) return false;
  for (const exc of catRule.excludes) {
    if (n.includes(exc)) return false;
  }

  // Apply funnel rules on top
  const funRule = FUNNEL_RULES[funnel];
  if (!funRule) return false;
  if (funRule.contains && !n.includes(funRule.contains)) return false;
  for (const exc of funRule.excludes) {
    if (n.includes(exc)) return false;
  }

  return true;
}

// LC to LP metric
export function calcLCtoLP(lc: number, lp: number): number | null {
  if (lc === 0) return null;
  return Math.round((lp / lc) * 100 * 10) / 10; // e.g. 34.5%
}

// CPM metric
export function calcCPM(spend: number, impressions: number): number | null {
  if (impressions === 0) return null;
  return Math.round((spend / impressions) * 1000 * 100) / 100; // e.g. ₹42.36
}

// % change between two values
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// Last 7 days logic
export function calcLast7DaysComparison(
  dailyData: any[],
  metricFn: (row: any) => number | null
): { yesterday: number | null; last7avg: number | null; pct: number | null } {
  const today     = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yStr      = fmtDate(yesterday);

  // last 7 days = yesterday-7 to yesterday-1
  const last7: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const d    = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - i);
    const dStr = fmtDate(d);
    const row  = dailyData.find(r => r.period === dStr);
    if (row) {
      const val = metricFn(row);
      if (val != null) last7.push(val);
    }
  }

  const ydayRow  = dailyData.find(r => r.period === yStr);
  const ydayVal  = ydayRow ? metricFn(ydayRow) : null;
  const last7avg = last7.length > 0
    ? Math.round(last7.reduce((s, v) => s + v, 0) / last7.length * 10) / 10
    : null;
  const pct = ydayVal != null && last7avg != null ? pctChange(ydayVal, last7avg) : null;

  return { yesterday: ydayVal, last7avg, pct };
}
