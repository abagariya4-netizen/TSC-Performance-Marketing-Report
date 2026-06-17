const fs = require('fs');
let content = fs.readFileSync('lib/googleCityMap.ts', 'utf8');

const match = content.match(/export const GOOGLE_CITY_MAP: Record<string, string> = \{([\s\S]*?)\};/);
if (match) {
  const innerContent = match[1];
  const map = new Map();
  const pairRegex = /'([^']+)'\s*:\s*'([^']+)'/g;
  let pairMatch;
  while ((pairMatch = pairRegex.exec(innerContent)) !== null) {
    map.set(pairMatch[1], pairMatch[2]);
  }
  
  // 1. DELETE gandhinagar
  map.delete('gandhinagar');
  
  // 2. DELETE wrong entries
  const toDelete = [
    'dharwad', 'hubli', 'margao', 'vasco da gama', 'mapusa',
    'ponda', 'porvorim', 'calangute', 'pernem', 'bicholim', 'panchkula'
  ];
  for (const k of toDelete) {
    map.delete(k);
  }
  
  // 3. ADD exact entries
  const toAdd = {
    'kondapur': 'Hyderabad',
    'nallagandla': 'Hyderabad',
    'hubli-dharwad': 'Hubballi',
    'adai': 'Mumbai',
    'hanamkonda': 'Warangal',
    'kelambakkam': 'Chennai',
    'guduvancheri': 'Chennai',
    'malappuram': 'Kozhikode',
    'kakkanad': 'Kochi',
    'new town': 'Kolkata',
    'madgaon': 'Goa',
    'panchkula': 'Mohali'
  };
  
  for (const [k, v] of Object.entries(toAdd)) {
    map.set(k, v);
  }
  
  let newInnerContent = '\n';
  for (const [k, v] of map.entries()) {
    newInnerContent += `  '${k}': '${v}',\n`;
  }
  
  content = content.replace(match[0], `export const GOOGLE_CITY_MAP: Record<string, string> = {${newInnerContent}};`);
  fs.writeFileSync('lib/googleCityMap.ts', content);
  console.log('Modifications applied successfully!');
} else {
  console.log('Error: Could not parse GOOGLE_CITY_MAP');
}
