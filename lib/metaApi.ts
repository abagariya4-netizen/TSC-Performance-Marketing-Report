const BASE = 'https://graph.facebook.com/v19.0';

export async function fetchAllPages(url: string): Promise<any[]> {
  let rows: any[] = [];
  let next: string | null = url;
  let page = 0;
  while (next) {
    page++;
    const res: Response  = await fetch(next, { cache: 'no-store' });
    const json = await res.json();
    if (json.error) throw new Error(`Meta API error: ${json.error.message}`);
    if (json.data?.length) rows = rows.concat(json.data);
    next = json.paging?.next || null;
    if (page >= 50) break;
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
