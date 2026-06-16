"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var https = require("https");
var env = fs.readFileSync('.env.local', 'utf8');
var tokenMatch = env.match(/META_ACCESS_TOKEN=(.*)/);
var token = tokenMatch ? tokenMatch[1].trim() : '';
var idMatch = env.match(/META_AD_ACCOUNT_ID=(.*)/);
var accountId = idMatch ? idMatch[1].trim() : '';
var url = "https://graph.facebook.com/v19.0/".concat(accountId, "/customconversions?fields=name,id&limit=100&access_token=").concat(token);
https.get(url, function (res) {
    var data = '';
    res.on('data', function (chunk) { return data += chunk; });
    res.on('end', function () {
        var json = JSON.parse(data);
        if (json.data) {
            console.log('Custom Conversions:');
            json.data.forEach(function (cc) { return console.log("".concat(cc.name, ": ").concat(cc.id)); });
        }
        else {
            console.log('Error:', json);
        }
    });
});
