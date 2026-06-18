"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSVLine = parseCSVLine;
exports.cleanNum = cleanNum;
exports.parseRegionPlanCSV = parseRegionPlanCSV;
exports.parseCityPlanCSV = parseCityPlanCSV;
exports.parseGoogle6CityPlanCSV = parseGoogle6CityPlanCSV;
function parseCSVLine(line) {
    var result = [];
    var cur = '', inQ = false;
    for (var _i = 0, line_1 = line; _i < line_1.length; _i++) {
        var ch = line_1[_i];
        if (ch === '"') {
            inQ = !inQ;
        }
        else if (ch === ',' && !inQ) {
            result.push(cur.trim());
            cur = '';
        }
        else {
            cur += ch;
        }
    }
    result.push(cur.trim());
    return result;
}
function cleanNum(s) {
    return parseFloat(String(s).replace(/[",\s₹$\r]/g, ''));
}
var KNOWN_STATES = [
    "maharashtra", "karnataka", "tamil nadu", "telangana", "delhi", "gujarat",
    "uttar pradesh", "west bengal", "andhra pradesh", "rajasthan", "haryana",
    "kerala", "punjab region", "punjab", "madhya pradesh", "bihar", "odisha",
    "assam", "jharkhand", "chhattisgarh", "uttarakhand", "jammu and kashmir",
    "himachal pradesh", "chandigarh", "goa", "puducherry", "unknown"
];
function parseRegionPlanCSV(text) {
    var lines = text.split(/\r\n|\n|\r/).filter(function (l) { return l.trim(); });
    var allRows = lines.map(parseCSVLine);
    var dataRows = allRows.slice(1).filter(function (r) { return r.length >= 2; });
    if (!dataRows.length)
        return {};
    var n = dataRows[0].length;
    var rScore = new Array(n).fill(0);
    var nScore = new Array(n).fill(0);
    dataRows.forEach(function (row) {
        row.forEach(function (cell, i) {
            if (KNOWN_STATES.includes(cell.toLowerCase().trim().replace(/\r/g, '')))
                rScore[i]++;
            var num = cleanNum(cell);
            if (!isNaN(num) && num > 100)
                nScore[i]++;
        });
    });
    var rCol = rScore.indexOf(Math.max.apply(Math, rScore));
    var nCopy = __spreadArray([], nScore, true);
    nCopy[rCol] = -1;
    var pCol = nCopy.indexOf(Math.max.apply(Math, nCopy));
    var plan = {};
    dataRows.forEach(function (row) {
        var region = (row[rCol] || '').trim().replace(/\r/g, '');
        var val = cleanNum(row[pCol] || '');
        if (region && region.toLowerCase() !== 'grand total' && !isNaN(val) && val > 0) {
            plan[region] = val;
        }
    });
    return plan;
}
var CITY_HEADERS = ["maharashtra", "karnataka", "tamil nadu", "telangana", "gujarat"];
var DELHI_KEYWORDS = ["delhi"];
var FUNNEL_MAP = {
    top: 'Top', mid: 'Mid', middle: 'Mid',
    bottom: 'Bottom', bot: 'Bottom',
    rnf: 'RNF', group: 'Group',
    total: 'Total', 'grand total': 'Total'
};
function parseCityPlanCSV(text) {
    var lines = text.split(/\r\n|\n|\r/).filter(function (l) { return l.trim(); });
    var allRows = lines.map(parseCSVLine);
    var cityPlan = {};
    var currentCity = null;
    var _loop_1 = function (row) {
        var col0 = (row[0] || '').trim().replace(/\r/g, '').toLowerCase();
        var col1 = (row[1] || '').trim().replace(/\r/g, '');
        if (!col0)
            return "continue";
        if (FUNNEL_MAP[col0] && currentCity) {
            var val = cleanNum(col1);
            if (!isNaN(val) && val >= 0)
                cityPlan[currentCity][FUNNEL_MAP[col0]] = val;
            return "continue";
        }
        var isCity = CITY_HEADERS.includes(col0) || DELHI_KEYWORDS.some(function (k) { return col0.includes(k); });
        if (isCity) {
            currentCity = col0.includes('delhi')
                ? 'Delhi+NCR'
                : row[0].trim().replace(/\r/g, '').split(' ')
                    .map(function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
            cityPlan[currentCity] = {};
        }
    };
    for (var _i = 0, allRows_1 = allRows; _i < allRows_1.length; _i++) {
        var row = allRows_1[_i];
        _loop_1(row);
    }
    return cityPlan;
}
var GOOGLE_FUNNEL_MAP = {
    search: 'Search',
    'branded search': 'Branded Search',
    'demand gen clicks': 'Demand Gen Clicks',
    'demand gen video': 'Demand Gen Video',
    'performance max': 'Performance Max',
    pmax: 'Performance Max',
    shopping: 'Shopping',
    display: 'Display',
    total: 'Total',
    'grand total': 'Total'
};
function parseGoogle6CityPlanCSV(text) {
    var lines = text.split(/\r\n|\n|\r/).filter(function (l) { return l.trim(); });
    var allRows = lines.map(parseCSVLine);
    var cityPlan = {};
    var currentCity = null;
    var _loop_2 = function (row) {
        var col0 = (row[0] || '').trim().replace(/\r/g, '').toLowerCase();
        var col1 = (row[1] || '').trim().replace(/\r/g, '');
        if (!col0)
            return "continue";
        if (GOOGLE_FUNNEL_MAP[col0] && currentCity) {
            var val = cleanNum(col1);
            if (!isNaN(val) && val >= 0)
                cityPlan[currentCity][GOOGLE_FUNNEL_MAP[col0]] = val;
            return "continue";
        }
        var isCity = CITY_HEADERS.includes(col0) || DELHI_KEYWORDS.some(function (k) { return col0.includes(k); });
        if (isCity) {
            currentCity = col0.includes('delhi')
                ? 'Delhi+NCR'
                : row[0].trim().replace(/\r/g, '').split(' ')
                    .map(function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
            cityPlan[currentCity] = {};
        }
    };
    for (var _i = 0, allRows_2 = allRows; _i < allRows_2.length; _i++) {
        var row = allRows_2[_i];
        _loop_2(row);
    }
    return cityPlan;
}
