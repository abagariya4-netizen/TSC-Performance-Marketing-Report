const fs = require('fs');
const text = fs.readFileSync('C:/Users/admin/Downloads/actual_google_plan_test.csv - Sheet1.csv', 'utf8');

function parseCSVLine(line) {
  if (line.includes('\t')) return line.split('\t').map(x => x.trim());
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

const GOOGLE_6CITY_HEADERS = [
  "mumbai", "maharashtra", 
  "bengaluru", "bangalore", "karnataka", 
  "chennai", "tamil nadu", 
  "hyderabad", "telangana", 
  "gujarat", "ahmedabad", "surat"
];
const GOOGLE_DELHI_KEYWORDS = ["delhi", "ncr", "noida", "gurgaon"];

const GOOGLE_FUNNEL_MAP = {
  'search': 'Search',
  'branded search': 'Branded Search',
  'demand gen video': 'Demand Gen Video',
  'demand gen clicks': 'Demand Gen Clicks',
  'performance max': 'Performance Max',
  pmax: 'Performance Max',
  shopping: 'Shopping',
  display: 'Display',
  total: 'Total',
  'grand total': 'Total'
};

function parse(text) {
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim());
  const allRows = lines.map(parseCSVLine);
  const cityPlan = {};
  let currentCity = null;

  for (const row of allRows) {
    const col0 = (row[0] || '').trim().replace(/\r/g, '').toLowerCase();
    const col1 = (row[1] || '').trim().replace(/\r/g, '');
    if (!col0) continue;

    if (GOOGLE_FUNNEL_MAP[col0] && currentCity) {
      const val = cleanNum(col1);
      if (!isNaN(val) && val >= 0) cityPlan[currentCity][GOOGLE_FUNNEL_MAP[col0]] = val;
      continue;
    }

    const isCity = GOOGLE_6CITY_HEADERS.some(k => col0.includes(k)) || GOOGLE_DELHI_KEYWORDS.some(k => col0.includes(k));
    const isSpecial = col0 === 'unknown' || col0 === 'rest of india';

    if (isCity || isSpecial) {
      if (isSpecial) {
        currentCity = col0 === 'unknown' ? 'Unknown' : 'Rest';
      } else {
        if (GOOGLE_DELHI_KEYWORDS.some(k => col0.includes(k))) currentCity = 'Delhi+NCR';
        else if (col0.includes('gujarat') || col0.includes('ahmedabad') || col0.includes('surat')) currentCity = 'Gujarat';
        else if (col0.includes('mumbai') || col0.includes('maharashtra')) currentCity = 'Mumbai';
        else if (col0.includes('bengaluru') || col0.includes('bangalore') || col0.includes('karnataka')) currentCity = 'Bengaluru';
        else if (col0.includes('chennai') || col0.includes('tamil nadu')) currentCity = 'Chennai';
        else if (col0.includes('hyderabad') || col0.includes('telangana')) currentCity = 'Hyderabad';
        else currentCity = 'Unknown';
      }
      cityPlan[currentCity] = {};
    }
  }
  return cityPlan;
}

const plan = parse(text);
console.log(Object.keys(plan));
console.log(plan);
