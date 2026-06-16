import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { matchesCategoryForMetrics, classifyFunnel } from '@/lib/metricUtils';

const ACCOUNT_ID = 'act_2240079932900749';
const BASE_URL = 'https://graph.facebook.com/v19.0';

const CATEGORY_CONVERSION_ACTION: Record<string, string> = {
  'Mattress':     'cl_overall_mattress_purchase',
  'Chair':        'cl_overall_chair_purchase',
  'Desk':         'cl_overall_desk_purchase',
  'Sofa':         'cl_overall_sofa_purchase',
  'Elite':        'elite_purchase_offline',
  'Foot Massager':'cl_overall_foot_massager_purchase',
};

const PLACEMENT_LABELS: Record<string, string> = {
  'facebook|feed':                'Feed',
  'instagram|story':              'Instagram Stories',
  'instagram|reels':              'Instagram Reels',
  'instagram|stream':             'Instagram Feed',
  'facebook|video_feeds':         'Facebook Video Feeds',
  'facebook|marketplace':         'Marketplace',
  'facebook|right_hand_column':   'Right Hand Column',
  'facebook|story':                'Facebook Stories',
  'facebook|reels':                'Facebook Reels',
  'audience_network|classic':     'Audience Network',
  'messenger|story':               'Messenger Stories',
};

function passesFilter(campaignName: string, adsetName: string, category: string, funnel: string): boolean {
  if (!matchesCategoryForMetrics(campaignName, adsetName, category)) {
    return false;
  }
  if (funnel !== 'All') {
    const rowFunnel = classifyFunnel(campaignName);
    if (rowFunnel !== funnel.toUpperCase()) return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'All';
  const funnel = searchParams.get('funnel') || 'All';
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  if (!since || !until) return NextResponse.json({ error: 'Missing since or until parameter' }, { status: 400 });

  try {
    const timeRangeStr = encodeURIComponent(JSON.stringify({ since, until }));

    // STEP 1: Fetch all adsets to filter
    const adsetUrl = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,adset_id&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
    const allAdsets = await fetchAllPages(adsetUrl);

    const validAdsetIds = new Set<string>();
    for (const row of allAdsets) {
      if (passesFilter(row.campaign_name, row.adset_name, category, funnel)) {
        if (row.adset_id) {
          validAdsetIds.add(row.adset_id);
        }
      }
    }

    const adsetIdArray = Array.from(validAdsetIds);
    if (adsetIdArray.length === 0) {
       return NextResponse.json({ placements: {}, periods: [] });
    }

    // STEP 2: Fetch breakdown data in chunks of 50 adset IDs
    const CHUNK_SIZE = 50;
    let allBreakdowns: any[] = [];
    
    for (let i = 0; i < adsetIdArray.length; i += CHUNK_SIZE) {
      const chunk = adsetIdArray.slice(i, i + CHUNK_SIZE);
      const filteringStr = encodeURIComponent(JSON.stringify([
        { field: 'adset.id', operator: 'IN', value: chunk }
      ]));
      
      const breakdownUrl = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,ctr,cpc,cpm,actions,action_values&level=adset&breakdowns=publisher_platform,platform_position&time_range=${timeRangeStr}&filtering=${filteringStr}&limit=500&time_increment=monthly&access_token=${token}`;
      
      const chunkData = await fetchAllPages(breakdownUrl);
      allBreakdowns = allBreakdowns.concat(chunkData);
    }

    // Grouping
    // Structure: Record<PlacementName, Record<MonthYYYYMM, Metrics>>
    const result: Record<string, Record<string, any>> = {};
    const periodsSet = new Set<string>();

    for (const row of allBreakdowns) {
      if (!row.date_start) continue;
      // Extract YYYY-MM
      const yyyyMM = row.date_start.substring(0, 7) + '-01'; 
      periodsSet.add(yyyyMM);

      const pub = row.publisher_platform || 'unknown';
      const pos = row.platform_position || 'unknown';
      const rawPlacement = `${pub}|${pos}`;
      const placementName = PLACEMENT_LABELS[rawPlacement] || `${pub} ${pos}`;

      if (!result[placementName]) result[placementName] = {};
      if (!result[placementName][yyyyMM]) {
        result[placementName][yyyyMM] = {
          spend: 0, impressions: 0, clicks: 0, link_clicks: 0, landing_page_views: 0,
          category_purchase: 0, overall_purchase: 0
        };
      }

      const m = result[placementName][yyyyMM];
      m.spend += parseFloat(row.spend || '0');
      m.impressions += parseInt(row.impressions || '0', 10);
      m.clicks += parseInt(row.clicks || '0', 10);

      const actions = row.actions || [];
      const actionVals = row.action_values || [];
      
      m.link_clicks += parseInt(actions.find((a: any) => a.action_type === 'link_click')?.value || '0', 10);
      m.landing_page_views += parseInt(actions.find((a: any) => a.action_type === 'landing_page_view')?.value || '0', 10);
      
      m.overall_purchase += parseFloat(actionVals.find((a: any) => a.action_type === 'omni_purchase')?.value || '0');
      
      const catAction = CATEGORY_CONVERSION_ACTION[category];
      if (catAction) {
        const matchVal = actionVals.find((a: any) => 
          a.action_type === catAction || 
          a.action_type === `offsite_conversion.custom.${catAction}` ||
          a.action_type === `custom.${catAction}`
        );
        m.category_purchase += parseFloat(matchVal?.value || '0');
      }
    }

    const periods = Array.from(periodsSet).sort();

    return NextResponse.json({
      placements: result,
      periods,
      hasCategoryAction: !!CATEGORY_CONVERSION_ACTION[category],
      category
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
