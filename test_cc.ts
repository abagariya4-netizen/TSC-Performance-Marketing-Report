import * as fs from 'fs';
import * as https from 'https';

const env = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = env.match(/META_ACCESS_TOKEN=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';
const idMatch = env.match(/META_AD_ACCOUNT_ID=(.*)/);
const accountId = idMatch ? idMatch[1].trim() : '';

const url = `https://graph.facebook.com/v19.0/${accountId}/customconversions?fields=name,id&limit=100&access_token=${token}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.data) {
      console.log('Custom Conversions:');
      json.data.forEach((cc: any) => console.log(`${cc.name}: ${cc.id}`));
    } else {
      console.log('Error:', json);
    }
  });
});
