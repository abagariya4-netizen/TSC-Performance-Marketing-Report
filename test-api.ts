import { GET } from './app/api/brand-impression/keywords/route';
import { NextRequest } from 'next/server';

async function run() {
  const req = new NextRequest('http://localhost:3000/api/brand-impression/keywords?campaignId=20434028372');
  const res = await GET(req);
  const json = await res.json();
  
  if (json.error) {
    console.error('Error:', json.error);
    return;
  }
  
  const keywords = json.keywords.slice(0, 5);
  console.log("Month labels:", json.monthLabels);
  keywords.forEach((k: any) => {
    console.log(`\nKeyword: ${k.keyword}`);
    json.monthLabels.forEach((m: string) => {
      console.log(`  ${m} -> Spend: ${k[m]?.spend}, IS: ${k[m]?.impressionShare.toFixed(2)}%`);
    });
  });
}

run().catch(console.error);
