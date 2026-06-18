import { parseGoogle6CityPlanCSV } from './lib/csvParser';
const text = `Mumbai,June'26
Search,869657
Performance Max,1047440
Branded Search,358034
Demand Gen Video,197463
Demand Gen Clicks,1020115
Shopping,54059
Display,69765
Total,3616532

Bengaluru,June'26
Search,1159959
Performance Max,933529
Video,0
Branded Search,596883
Demand Gen Video,9694
Demand Gen Clicks,906241
Shopping,84017
Display,90359
Total,3780681

Chennai,June'26
Search,891469
Performance Max,858013

Hyderabad,June'26
Search,914047

Gujarat (Ahmedabad),June'26
Search,371612

Delhi+NCR,June'26
Search,1278136`;
const plan = parseGoogle6CityPlanCSV(text);
console.log("Keys detected:", Object.keys(plan));
console.log("Plan:", JSON.stringify(plan, null, 2));
