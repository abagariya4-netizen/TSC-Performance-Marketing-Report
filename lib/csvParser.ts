export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

export function cleanNum(s: string): number {
  return parseFloat(String(s).replace(/[",\s₹$\r]/g, ''));
}

const KNOWN_STATES = [
  "maharashtra","karnataka","tamil nadu","telangana","delhi","gujarat",
  "uttar pradesh","west bengal","andhra pradesh","rajasthan","haryana",
  "kerala","punjab region","punjab","madhya pradesh","bihar","odisha",
  "assam","jharkhand","chhattisgarh","uttarakhand","jammu and kashmir",
  "himachal pradesh","chandigarh","goa","puducherry","unknown"
];

export function parseRegionPlanCSV(text: string): Record<string, number> {
  const lines    = text.split(/\r?\n/).filter(l => l.trim());
  const allRows  = lines.map(parseCSVLine);
  const dataRows = allRows.slice(1).filter(r => r.length >= 2);
  if (!dataRows.length) return {};

  const n = dataRows[0].length;
  const rScore = new Array(n).fill(0);
  const nScore = new Array(n).fill(0);

  dataRows.forEach(row => {
    row.forEach((cell, i) => {
      if (KNOWN_STATES.includes(cell.toLowerCase().trim().replace(/\r/g, ''))) rScore[i]++;
      const num = cleanNum(cell);
      if (!isNaN(num) && num > 100) nScore[i]++;
    });
  });

  const rCol = rScore.indexOf(Math.max(...rScore));
  const nCopy = [...nScore]; nCopy[rCol] = -1;
  const pCol  = nCopy.indexOf(Math.max(...nCopy));

  const plan: Record<string, number> = {};
  dataRows.forEach(row => {
    const region = (row[rCol] || '').trim().replace(/\r/g, '');
    const val    = cleanNum(row[pCol] || '');
    if (region && region.toLowerCase() !== 'grand total' && !isNaN(val) && val > 0) {
      plan[region] = val;
    }
  });
  return plan;
}

const CITY_HEADERS   = ["maharashtra","karnataka","tamil nadu","telangana","gujarat"];
const DELHI_KEYWORDS = ["delhi"];
const FUNNEL_MAP: Record<string, string> = {
  top:'Top', mid:'Mid', middle:'Mid',
  bottom:'Bottom', bot:'Bottom',
  rnf:'RNF', group:'Group',
  total:'Total', 'grand total':'Total'
};

export function parseCityPlanCSV(text: string): Record<string, Record<string, number>> {
  const lines    = text.split(/\r?\n/).filter(l => l.trim());
  const allRows  = lines.map(parseCSVLine);
  const cityPlan: Record<string, Record<string, number>> = {};
  let currentCity: string | null = null;

  for (const row of allRows) {
    const col0 = (row[0] || '').trim().replace(/\r/g, '').toLowerCase();
    const col1 = (row[1] || '').trim().replace(/\r/g, '');
    if (!col0) continue;

    if (FUNNEL_MAP[col0] && currentCity) {
      const val = cleanNum(col1);
      if (!isNaN(val) && val >= 0) cityPlan[currentCity][FUNNEL_MAP[col0]] = val;
      continue;
    }

    const isCity = CITY_HEADERS.includes(col0) || DELHI_KEYWORDS.some(k => col0.includes(k));
    if (isCity) {
      currentCity = col0.includes('delhi')
        ? 'Delhi+NCR'
        : row[0].trim().replace(/\r/g, '').split(' ')
            .map((w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      cityPlan[currentCity] = {};
    }
  }
  return cityPlan;
}
