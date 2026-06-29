import { getDefaultMonths, getMonthsInRange } from './lib/dateRangeUtils';

console.log('getDefaultMonths():', getDefaultMonths());

const start = new Date('2026-03-01');
const end = new Date('2026-06-24');
console.log('getMonthsInRange string:', getMonthsInRange(start, end));
