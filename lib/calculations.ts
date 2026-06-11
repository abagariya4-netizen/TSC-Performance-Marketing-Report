export function calcRow(
  mtd: number, yday: number, plan: number | null,
  daysPassed: number, totalDays: number, daysRemaining: number
) {
  const est          = mtd + (yday * daysRemaining);
  const diffPct      = plan != null
    ? Math.round(((mtd / (plan * daysPassed / totalDays)) - 1) * 100)
    : null;
  const estMinusPlan = plan != null ? est - plan : null;
  const overUnder    = plan != null ? (est >= plan ? 'Over' : 'Under') : null;
  return { mtd, yday, est, diffPct, estMinusPlan, overUnder };
}

export function formatINR(n: number | null): string {
  if (n == null) return '—';
  return Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
