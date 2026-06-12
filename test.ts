import { matchesCategoryForMetrics } from './lib/metricUtils';

console.log('Test 1:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_Dhoni_Walkin_NST', 'Mattress_All_Asset', 'Mattress'));
console.log('Test 2:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_Dhoni_Walkin_NST', 'Chair_All_Asset', 'Mattress'));
console.log('Test 3:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_O_Cities_Purchase_Mat', 'Chair', 'Mattress'));
console.log('Test 4:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_Dhoni_Walkin_NST', 'Mattress_Video', 'Mattress'));
console.log('Test 5:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_Dhoni_Walkin_NST', 'Sofa_Video', 'Mattress'));
console.log('Test 6:', matchesCategoryForMetrics('ASC_Chair_Mid_Funnel_Core_NST', 'Signals', 'Chair'));
console.log('Test 7:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_Dhoni_Walkin_NST', 'Chair_All_Asset', 'Chair'));
console.log('Test 8:', matchesCategoryForMetrics('TSC_All_Products_ASC_Mid_Funnel_Dhoni_Walkin_NST', 'Mattress_All_Asset', 'Chair'));
