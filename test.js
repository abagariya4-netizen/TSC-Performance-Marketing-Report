const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function cleanNum(s) {
  return parseFloat(String(s).replace(/[",\s₹$\r]/g, ''));
}

const CITY_HEADERS   = ["maharashtra","karnataka","tamil nadu","telangana","gujarat"];
const DELHI_KEYWORDS = ["delhi"];
const FUNNEL_MAP = {
  top:'Top', mid:'Mid', middle:'Mid',
  bottom:'Bottom', bot:'Bottom',
  rnf:'RNF', group:'Group',
  total:'Total', 'grand total':'Total'
};

function parseCityPlanCSV(text) {
  const lines    = text.split(/\r?\n/).filter(l => l.trim());
  const allRows  = lines.map(parseCSVLine);
  const cityPlan = {};
  let currentCity = null;

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
            .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      cityPlan[currentCity] = {};
    }
  }
  return cityPlan;
}

const testCSV = `Maharashtra
Top, 1000
Mid, 2000
Bottom, 3000
Karnataka
Top, 1000
Mid, 2000
Bottom, 3000
Delhi
Top, 1000`;

console.log("Result:", parseCityPlanCSV(testCSV));
