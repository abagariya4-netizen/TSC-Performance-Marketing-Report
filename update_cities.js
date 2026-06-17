const fs = require('fs');
const text = fs.readFileSync('raw-cities.txt', 'utf8').trim().split('\n');

const map = new Map();
for (let line of text) {
  if (line.trim() === '' || line.startsWith('City\t')) continue;
  const parts = line.split('\t');
  if (parts.length >= 2) {
    const k = parts[0].trim().toLowerCase();
    const v = parts[1].trim();
    // Some basic normalizations
    let finalV = v;
    if (v.toLowerCase() === 'bengaluru') finalV = 'Bengaluru';
    if (v.toLowerCase() === 'chennai') finalV = 'Chennai';
    if (v.toLowerCase() === 'mumbai') finalV = 'Mumbai';
    if (v.toLowerCase() === 'pune') finalV = 'Pune';
    if (v.toLowerCase() === 'hyderabad') finalV = 'Hyderabad';
    if (v.toLowerCase() === 'mohali') finalV = 'Mohali';
    
    map.set(k, finalV);
  }
}

console.log('Total entries matched:', map.size);

let newInnerContent = '\n';
for (const [k, v] of map.entries()) {
  newInnerContent += `  '${k}': '${v}',\n`;
}

let content = fs.readFileSync('lib/googleCityMap.ts', 'utf8');
const match = content.match(/export const GOOGLE_CITY_MAP: Record<string, string> = \{([\s\S]*?)\};/);

if (match) {
  content = content.replace(match[0], `export const GOOGLE_CITY_MAP: Record<string, string> = {${newInnerContent}};`);
  fs.writeFileSync('lib/googleCityMap.ts', content);
  console.log('Successfully updated lib/googleCityMap.ts');
} else {
  console.log('Error: Could not parse GOOGLE_CITY_MAP from file');
}
