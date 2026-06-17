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
  
  map.delete('madgaon');
  
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
