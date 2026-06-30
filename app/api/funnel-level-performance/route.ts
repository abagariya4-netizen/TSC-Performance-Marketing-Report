import { NextResponse, NextRequest } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';
import { getMonthsInRange, getDefaultMonths } from '@/lib/dateRangeUtils';
import { matchesCategoryForMetrics, classifyFunnel } from '@/lib/metricUtils';

export const dynamic = 'force-dynamic';

const ACCOUNT_ID = 'act_2240079932900749';
const BASE_URL = 'https://graph.facebook.com/v19.0';

const CATEGORY_CONVERSION_ACTION: Record<string, string> = {
  'Mattress': 'offsite_conversion.custom.cl_overall_mattress_purchase',
  'Chair': 'offsite_conversion.custom.cl_overall_chair_purchase',
  'Sofa': 'offsite_conversion.custom.cl_overall_sofa_purchase',
  'Desk': 'offsite_conversion.custom.cl_overall_desk_purchase',
  'Elite': 'offsite_conversion.custom.elite_purchase_offline',
  'Foot Massager': 'offsite_conversion.custom.cl_overall_foot_massager_purchase',
  'Accessories': 'omni_purchase',
  'Bed': 'omni_purchase',
  'All': 'omni_purchase'
};

const WALKIN_ACTION = 'cl_walk_in';
const OVERALL_ROAS_ACTION = 'omni_purchase';

const CAMPAIGN_EXCLUSION_KEYWORDS = ['chair', 'desk', 'sofa', 'elite', 'foot', 'growth', 'acce'];
const ADSET_EXCLUSION_KEYWORDS = ['boost', 'growth'];

function isCampaignExcluded(name: string): boolean {
  const cn = (name || '').toLowerCase();
  return CAMPAIGN_EXCLUSION_KEYWORDS.some(kw => cn.includes(kw));
}

function isAdsetExcluded(name: string): boolean {
  const an = (name || '').toLowerCase();
  return ADSET_EXCLUSION_KEYWORDS.some(kw => an.includes(kw));
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'All';
  let startDate = searchParams.get('startDate');
  let endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    const def = getDefaultMonths();
    startDate = def[0].startDate;
    endDate = def[def.length - 1].endDate;
  }

  const periods = getMonthsInRange(new Date(startDate), new Date(endDate));

  try {
    const campaignsMap = new Map<string, any>();
    const getCampNode = (name: string) => campaignsMap.get(name);

    ['Top', 'Mid', 'Bot'].forEach(name => {
      const node: any = { name };
      periods.forEach(p => {
        node[p.label] = { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 };
      });
      campaignsMap.set(name, node);
    });

    const fetchPeriod = async (p: any) => {
      const timeRangeStr = encodeURIComponent(JSON.stringify({ since: p.startDate, until: p.endDate }));
      const url = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,impressions,clicks,actions,action_values,results,cost_per_result&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
      const data = await fetchAllPages(url);
      
      for (const row of data) {
        const cName = row.campaign_name || '';
        const aName = row.adset_name || '';

        const cn = cName.toLowerCase();
        const an = aName.toLowerCase();

        if (cn.includes('growth')) continue;

        if (!matchesCategoryForMetrics(cName, aName, category)) continue;

        let rawFunnel: string | null = classifyFunnel(cName);
        if (rawFunnel === 'BOTTOM') rawFunnel = 'Bot';
        if (rawFunnel === 'TOP') rawFunnel = 'Top';
        if (rawFunnel === 'MID') rawFunnel = 'Mid';
        
        const funnelName = rawFunnel;
        if (!funnelName) continue;
        
        const node = getCampNode(funnelName);
        if (!node) continue;
        const m = node[p.label];

        m.spend += parseFloat(row.spend || '0');
        m.impressions += parseInt(row.impressions || '0', 10);
        m.clicks += parseInt(row.clicks || '0', 10);

        const actions = row.actions || [];
        const actionVals = row.action_values || [];

        m.lc += parseInt(actions.find((a: any) => a.action_type === 'link_click')?.value || '0', 10);
        m.lp += parseInt(actions.find((a: any) => a.action_type === 'landing_page_view')?.value || '0', 10);
        
        let walkins = 0;
        
        // METHOD 1 — Extract from results array (primary):
        const resultsArr = Array.isArray(row.results) 
          ? row.results
          : Array.isArray(row.results?.value) 
          ? row.results.value 
          : [];

        const wi = resultsArr.find(
          (x: any) => x.indicator && x.indicator.includes('cl_walk_in')
        );
        walkins = wi 
          ? +(wi.values?.[0]?.value || wi.value || 0) 
          : 0;

        // METHOD 2 — Fallback to actions array:
        if (!walkins && Array.isArray(row.actions)) {
          const action = row.actions.find(
            (x: any) => x.action_type && 
            x.action_type.includes('cl_walk_in')
          );
          if (action) walkins = parseFloat(action.value || '0');
        }

        // METHOD 3 — Final fallback exact match:
        if (!walkins && Array.isArray(row.actions)) {
          const action = row.actions.find(
            (x: any) => x.action_type === 
            'offsite_conversion.fb_pixel_custom.cl_walk_in'
          );
          if (action) walkins = parseFloat(action.value || '0');
        }

        m.walkin += walkins;

        const expectedAction = CATEGORY_CONVERSION_ACTION[category];
        if (expectedAction) {
           m.catValue += parseFloat(actionVals.find((a: any) => a.action_type === expectedAction || a.action_type === `custom.${expectedAction}`)?.value || '0');
        }
        m.overallValue += parseFloat(actionVals.find((a: any) => a.action_type === OVERALL_ROAS_ACTION || a.action_type === `custom.${OVERALL_ROAS_ACTION}`)?.value || '0');
      }
    };

    await Promise.all(periods.map(fetchPeriod));

    const finalCampaigns = [];
    const totalObj: any = {
      vsLastMonth: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0 },
      vsAvg3M: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0 }
    };
    periods.forEach(p => {
      totalObj[p.label] = { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 };
    });

    const calcMetrics = (m: any) => {
      m.cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
      m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
      m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      m.lcToLp = m.lc > 0 ? (m.lp / m.lc) * 100 : 0;
      m.categoryRoas = m.spend > 0 ? m.catValue / m.spend : 0;
      m.overallRoas = m.spend > 0 ? m.overallValue / m.spend : 0;
      m.cpw = m.walkin > 0 ? m.spend / m.walkin : 0;
    };

    const calcVs = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current / previous) - 1) * 100;
    };

    for (const [name, data] of Array.from(campaignsMap.entries())) {

      for (const p of periods) {
        const m = p.label;
        calcMetrics(data[m]);
        totalObj[m].spend += data[m].spend;
        totalObj[m].impressions += data[m].impressions;
        totalObj[m].clicks += data[m].clicks;
        totalObj[m].lc += data[m].lc;
        totalObj[m].lp += data[m].lp;
        totalObj[m].walkin += data[m].walkin;
        totalObj[m].catValue += data[m].catValue;
        totalObj[m].overallValue += data[m].overallValue;
      }

      data.vsLastMonth = { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0 };
      data.vsAvg3M = { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0 };

      if (periods.length >= 2) {
        const lastM = periods[periods.length - 1].label;
        const prevM = periods[periods.length - 2].label;
        data.vsLastMonth = {
          spend: calcVs(data[lastM].spend, data[prevM].spend),
          impressions: calcVs(data[lastM].impressions, data[prevM].impressions),
          lc: calcVs(data[lastM].lc, data[prevM].lc),
          lp: calcVs(data[lastM].lp, data[prevM].lp),
          walkin: calcVs(data[lastM].walkin, data[prevM].walkin),
          cpm: calcVs(data[lastM].cpm, data[prevM].cpm),
          cpc: calcVs(data[lastM].cpc, data[prevM].cpc),
          ctr: calcVs(data[lastM].ctr, data[prevM].ctr),
          lcToLp: calcVs(data[lastM].lcToLp, data[prevM].lcToLp),
          categoryRoas: calcVs(data[lastM].categoryRoas, data[prevM].categoryRoas),
          overallRoas: calcVs(data[lastM].overallRoas, data[prevM].overallRoas),
          cpw: calcVs(data[lastM].cpw, data[prevM].cpw)
        };

        const prevPeriods = periods.slice(0, -1).slice(-3);
        const avg3M = (key: string) => {
          let sum = 0;
          prevPeriods.forEach(p => sum += data[p.label][key]);
          return sum / prevPeriods.length;
        };

        data.vsAvg3M = {
          spend: calcVs(data[lastM].spend, avg3M('spend')),
          impressions: calcVs(data[lastM].impressions, avg3M('impressions')),
          lc: calcVs(data[lastM].lc, avg3M('lc')),
          lp: calcVs(data[lastM].lp, avg3M('lp')),
          walkin: calcVs(data[lastM].walkin, avg3M('walkin')),
          cpm: calcVs(data[lastM].cpm, avg3M('cpm')),
          cpc: calcVs(data[lastM].cpc, avg3M('cpc')),
          ctr: calcVs(data[lastM].ctr, avg3M('ctr')),
          lcToLp: calcVs(data[lastM].lcToLp, avg3M('lcToLp')),
          categoryRoas: calcVs(data[lastM].categoryRoas, avg3M('categoryRoas')),
          overallRoas: calcVs(data[lastM].overallRoas, avg3M('overallRoas')),
          cpw: calcVs(data[lastM].cpw, avg3M('cpw'))
        };
      }

      finalCampaigns.push(data);
    }

    for (const p of periods) {
      calcMetrics(totalObj[p.label]);
    }

    if (periods.length >= 2) {
      const lastM = periods[periods.length - 1].label;
      const prevM = periods[periods.length - 2].label;
      totalObj.vsLastMonth = {
        spend: calcVs(totalObj[lastM].spend, totalObj[prevM].spend),
        impressions: calcVs(totalObj[lastM].impressions, totalObj[prevM].impressions),
        lc: calcVs(totalObj[lastM].lc, totalObj[prevM].lc),
        lp: calcVs(totalObj[lastM].lp, totalObj[prevM].lp),
        walkin: calcVs(totalObj[lastM].walkin, totalObj[prevM].walkin),
        cpm: calcVs(totalObj[lastM].cpm, totalObj[prevM].cpm),
        cpc: calcVs(totalObj[lastM].cpc, totalObj[prevM].cpc),
        ctr: calcVs(totalObj[lastM].ctr, totalObj[prevM].ctr),
        lcToLp: calcVs(totalObj[lastM].lcToLp, totalObj[prevM].lcToLp),
        categoryRoas: calcVs(totalObj[lastM].categoryRoas, totalObj[prevM].categoryRoas),
        overallRoas: calcVs(totalObj[lastM].overallRoas, totalObj[prevM].overallRoas),
        cpw: calcVs(totalObj[lastM].cpw, totalObj[prevM].cpw)
      };

      const prevPeriods = periods.slice(0, -1).slice(-3);
      const avg3MTotal = (key: string) => {
        let sum = 0;
        prevPeriods.forEach(p => sum += totalObj[p.label][key]);
        return sum / prevPeriods.length;
      };

      totalObj.vsAvg3M = {
        spend: calcVs(totalObj[lastM].spend, avg3MTotal('spend')),
        impressions: calcVs(totalObj[lastM].impressions, avg3MTotal('impressions')),
        lc: calcVs(totalObj[lastM].lc, avg3MTotal('lc')),
        lp: calcVs(totalObj[lastM].lp, avg3MTotal('lp')),
        walkin: calcVs(totalObj[lastM].walkin, avg3MTotal('walkin')),
        cpm: calcVs(totalObj[lastM].cpm, avg3MTotal('cpm')),
        cpc: calcVs(totalObj[lastM].cpc, avg3MTotal('cpc')),
        ctr: calcVs(totalObj[lastM].ctr, avg3MTotal('ctr')),
        lcToLp: calcVs(totalObj[lastM].lcToLp, avg3MTotal('lcToLp')),
        categoryRoas: calcVs(totalObj[lastM].categoryRoas, avg3MTotal('categoryRoas')),
        overallRoas: calcVs(totalObj[lastM].overallRoas, avg3MTotal('overallRoas')),
        cpw: calcVs(totalObj[lastM].cpw, avg3MTotal('cpw'))
      };
    }

    return NextResponse.json({
      campaigns: finalCampaigns,
      total: totalObj,
      monthLabels: periods.map(p => p.label)
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
