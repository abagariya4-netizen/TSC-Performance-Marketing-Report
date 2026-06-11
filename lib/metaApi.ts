const BASE = 'https://graph.facebook.com/v19.0';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function fetchAllPages(url: string, retries = 4): Promise<any[]> {
  let rows: any[] = [];
  let next: string | null = url;
  let page = 0;
  while (next) {
    page++;
    
    let success = false;
    let attempt = 0;
    while (!success && attempt < retries) {
      attempt++;
      try {
        const res: Response  = await fetch(next, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.error) {
           const msg = json.error.message?.toLowerCase() || '';
           if (json.error.code === 17 || json.error.code === 4 || msg.includes('limit reached')) {
             if (attempt >= retries) throw new Error(`Meta API error: ${json.error.message}`);
             console.warn(`Rate limit hit on page ${page}, waiting ${attempt * 3}s before retry...`);
             await delay(attempt * 3000);
             continue; 
           }
           throw new Error(`Meta API error: ${json.error.message}`);
        }
        
        if (json.data?.length) rows = rows.concat(json.data);
        next = json.paging?.next || null;
        success = true;
      } catch (err: any) {
        if (attempt >= retries) throw err;
        console.warn(`Fetch failed, waiting ${attempt * 3}s...`);
        await delay(attempt * 3000);
      }
    }
    
    if (next) await delay(800);
    if (page >= 100) break;
  }
  return rows;
}

export function buildCampaignUrl(
  accountId: string, token: string,
  since: string, until: string
): string {
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  return `${BASE}/${accountId}/insights?fields=campaign_name,spend&breakdowns=region&time_range=${timeRange}&level=campaign&limit=500&access_token=${token}`;
}

export function buildAdsetUrl(
  accountId: string, token: string,
  since: string, until: string
): string {
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  return `${BASE}/${accountId}/insights?fields=campaign_name,adset_name,spend&breakdowns=region&time_range=${timeRange}&level=adset&limit=500&access_token=${token}`;
}
