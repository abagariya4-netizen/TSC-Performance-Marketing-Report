import { parseGoogle6CityPlanCSV } from './lib/csvParser';
import * as fs from 'fs';
const text = fs.readFileSync('C:\\Users\\admin\\Downloads\\actual_google_plan_test.csv - Sheet1.csv', 'utf8');
const plan = parseGoogle6CityPlanCSV(text);
console.log("Keys detected:", Object.keys(plan));
console.log(plan);
