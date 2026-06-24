export type Month = {
  label: string; // e.g. "Mar"
  fullLabel: string; // e.g. "March 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export function getMonthsInRange(start: Date, end: Date): Month[] {
  const months: Month[] = [];
  const currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const realEndDate = new Date(end); // Keep original end date to handle "yesterday" capping

  while (currentDate <= realEndDate || (currentDate.getMonth() === realEndDate.getMonth() && currentDate.getFullYear() === realEndDate.getFullYear())) {
    const isFirstMonth = months.length === 0 && currentDate.getMonth() === start.getMonth() && currentDate.getFullYear() === start.getFullYear();
    const isLastMonth = currentDate.getMonth() === realEndDate.getMonth() && currentDate.getFullYear() === realEndDate.getFullYear();

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), isFirstMonth ? start.getDate() : 1);
    
    let monthEnd: Date;
    if (isLastMonth) {
      monthEnd = new Date(realEndDate);
    } else {
      monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    months.push({
      label: currentDate.toLocaleString('default', { month: 'short' }),
      fullLabel: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0],
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return months;
}

export function getDefaultMonths(): Month[] {
  const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const today = new Date(istString);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  
  // 4 months back
  const start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  return getMonthsInRange(start, yesterday);
}
