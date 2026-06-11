export function fmtDate(d: Date): string {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateParams() {
  const today      = new Date();
  const yesterday  = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
  const daysPassed    = yesterday.getDate();
  const totalDays     = new Date(yesterday.getFullYear(), yesterday.getMonth() + 1, 0).getDate();
  const daysRemaining = totalDays - daysPassed;
  const displayMonth  = yesterday.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  return {
    yesterday, monthStart,
    daysPassed, totalDays, daysRemaining,
    displayMonth,
    sinceMTD:  fmtDate(monthStart),
    untilMTD:  fmtDate(yesterday),
    sinceYday: fmtDate(yesterday),
    untilYday: fmtDate(yesterday),
  };
}
