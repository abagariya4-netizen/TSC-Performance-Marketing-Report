import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPages } from '@/lib/metaApi';

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

const WALKIN_ACTION = 'offsite_conversion.custom.489677281790128';
const OVERALL_ROAS_ACTION = 'omni_purchase';

function classifyFunnel(campaignName: string): string {
  const lower = campaignName.toLowerCase();
  if (lower.includes('growth')) return 'Growth';
  if (lower.includes('bot')) return 'Bottom';
  if (lower.includes('mid')) return 'Mid';
  return 'Top';
}

function isProductCreative(adsetName: string): boolean {
  const lower = adsetName.toLowerCase();
  return lower.includes('_all_asset') || lower.includes(' all asset') || lower.includes('_video') || lower.includes(' video');
}

function passesCategoryFilter(campaignName: string, adsetName: string, category: string): boolean {
  if (category === 'All') return true;
  
  const lowerCamp = campaignName.toLowerCase();
  const lowerAdset = adsetName.toLowerCase();

  if (isProductCreative(adsetName)) {
    if (category === 'Mattress') return lowerAdset.includes('mat');
    if (category === 'Chair') return lowerAdset.includes('chair');
    if (category === 'Sofa') return lowerAdset.includes('sofa');
    if (category === 'Desk') return lowerAdset.includes('desk');
    if (category === 'Elite') return lowerAdset.includes('elite');
    if (category === 'Foot Massager') return lowerAdset.includes('foot');
    if (category === 'Accessories') return lowerAdset.includes('acce');
    if (category === 'Bed') return lowerAdset.includes('bed');
    return false;
  } else {
    if (category === 'Mattress') {
      if (!lowerCamp.includes('mat')) return false;
      const excludes = ['sofa','desk','elite','foot','bed','acce','chair','pillow','cushion','massa','sensai'];
      if (excludes.some(ex => lowerCamp.includes(ex))) return false;
      return true;
    }
    if (category === 'Chair') return lowerCamp.includes('chair');
    if (category === 'Sofa') return lowerCamp.includes('sofa');
    if (category === 'Desk') return lowerCamp.includes('desk');
    if (category === 'Elite') return lowerCamp.includes('elite');
    if (category === 'Foot Massager') return lowerCamp.includes('foot');
    if (category === 'Accessories') return lowerCamp.includes('acce');
    if (category === 'Bed') return lowerCamp.includes('bed');
    return false;
  }
}

function passesAdsetExclusions(adsetName: string, category: string): boolean {
  const lower = adsetName.toLowerCase();
  if (category === 'Mattress') {
    return !['sofa', 'desk', 'chair', 'boost', 'growth'].some(ex => lower.includes(ex));
  } else if (category === 'Chair') {
    return !['mattress', 'mat', 'desk', 'sofa', 'boost', 'growth'].some(ex => lower.includes(ex));
  } else if (category === 'Desk') {
    return !['mattress', 'mat', 'sofa', 'chair', 'boost', 'growth'].some(ex => lower.includes(ex));
  } else {
    return !['boost', 'growth'].some(ex => lower.includes(ex));
  }
}

function isCampaignExcluded(campaignName: string, selectedFunnel: string): boolean {
  const lower = campaignName.toLowerCase();
  if (lower.includes('boost')) return true;
  if (lower.includes('growth')) {
    if (selectedFunnel === 'Top' || selectedFunnel === 'Mid' || selectedFunnel === 'Bottom') return true;
  } else {
    if (selectedFunnel === 'Growth') return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('meta_token')?.value || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_ACCESS_TOKEN not set' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'All';
  const funnel = searchParams.get('funnel') || 'All';
  let startDate = searchParams.get('startDate');
  let endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    startDate = '2026-06-01';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    endDate = yesterday.toISOString().split('T')[0];
  }

  const periods = [
    { key: 'mar', since: '2026-03-01', until: '2026-03-31' },
    { key: 'apr', since: '2026-04-01', until: '2026-04-30' },
    { key: 'may', since: '2026-05-01', until: '2026-05-31' },
    { key: 'jun', since: startDate, until: endDate },
  ];

  try {
    const campaignsMap = new Map<string, any>();
    const getCampNode = (name: string) => {
      if (!campaignsMap.has(name)) {
        campaignsMap.set(name, {
          name,
          mar: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
          apr: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
          may: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
          jun: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 }
        });
      }
      return campaignsMap.get(name);
    };

    const fetchPeriod = async (p: any) => {
      const timeRangeStr = encodeURIComponent(JSON.stringify({ since: p.since, until: p.until }));
      const url = `${BASE_URL}/${ACCOUNT_ID}/insights?fields=campaign_name,adset_name,spend,impressions,clicks,actions,action_values&level=adset&time_range=${timeRangeStr}&limit=500&access_token=${token}`;
      const data = await fetchAllPages(url);
      
      for (const row of data) {
        const cName = row.campaign_name || '';
        const aName = row.adset_name || '';

        if (isCampaignExcluded(cName, funnel)) continue;
        if (funnel !== 'All' && classifyFunnel(cName) !== funnel) continue;
        if (!passesCategoryFilter(cName, aName, category)) continue;
        if (!passesAdsetExclusions(aName, category)) continue;

        const node = getCampNode(cName);
        const m = node[p.key];

        m.spend += parseFloat(row.spend || '0');
        m.impressions += parseInt(row.impressions || '0', 10);
        m.clicks += parseInt(row.clicks || '0', 10);

        const actions = row.actions || [];
        const actionVals = row.action_values || [];

        m.lc += parseInt(actions.find((a: any) => a.action_type === 'link_click')?.value || '0', 10);
        m.lp += parseInt(actions.find((a: any) => a.action_type === 'landing_page_view')?.value || '0', 10);
        m.walkin += parseInt(actions.find((a: any) => a.action_type === WALKIN_ACTION || a.action_type === `custom.${WALKIN_ACTION}`)?.value || '0', 10);

        const expectedAction = CATEGORY_CONVERSION_ACTION[category];
        if (expectedAction) {
           m.catValue += parseFloat(actionVals.find((a: any) => a.action_type === expectedAction || a.action_type === `custom.${expectedAction}`)?.value || '0');
        }
        m.overallValue += parseFloat(actionVals.find((a: any) => a.action_type === OVERALL_ROAS_ACTION || a.action_type === `custom.${OVERALL_ROAS_ACTION}`)?.value || '0');
      }
    };

    await Promise.all(periods.map(fetchPeriod));

    const finalCampaigns = [];
    const totalObj = {
      mar: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
      apr: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
      may: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
      jun: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0, clicks: 0, catValue: 0, overallValue: 0 },
      vsLastMonth: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0 },
      vsAvg3M: { spend: 0, categoryRoas: 0, overallRoas: 0, cpm: 0, cpw: 0, walkin: 0, ctr: 0, cpc: 0, lcToLp: 0, lc: 0, lp: 0, impressions: 0 }
    };

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
      if (data.mar.spend === 0 && data.apr.spend === 0 && data.may.spend === 0 && data.jun.spend === 0 &&
          data.mar.impressions === 0 && data.apr.impressions === 0 && data.may.impressions === 0 && data.jun.impressions === 0) {
        continue;
      }

      for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
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

      data.vsLastMonth = {
        spend: calcVs(data.jun.spend, data.may.spend),
        impressions: calcVs(data.jun.impressions, data.may.impressions),
        lc: calcVs(data.jun.lc, data.may.lc),
        lp: calcVs(data.jun.lp, data.may.lp),
        walkin: calcVs(data.jun.walkin, data.may.walkin),
        cpm: calcVs(data.jun.cpm, data.may.cpm),
        cpc: calcVs(data.jun.cpc, data.may.cpc),
        ctr: calcVs(data.jun.ctr, data.may.ctr),
        lcToLp: calcVs(data.jun.lcToLp, data.may.lcToLp),
        categoryRoas: calcVs(data.jun.categoryRoas, data.may.categoryRoas),
        overallRoas: calcVs(data.jun.overallRoas, data.may.overallRoas),
        cpw: calcVs(data.jun.cpw, data.may.cpw)
      };

      const avg3M = (key: string) => (data.mar[key] + data.apr[key] + data.may[key]) / 3;

      data.vsAvg3M = {
        spend: calcVs(data.jun.spend, avg3M('spend')),
        impressions: calcVs(data.jun.impressions, avg3M('impressions')),
        lc: calcVs(data.jun.lc, avg3M('lc')),
        lp: calcVs(data.jun.lp, avg3M('lp')),
        walkin: calcVs(data.jun.walkin, avg3M('walkin')),
        cpm: calcVs(data.jun.cpm, avg3M('cpm')),
        cpc: calcVs(data.jun.cpc, avg3M('cpc')),
        ctr: calcVs(data.jun.ctr, avg3M('ctr')),
        lcToLp: calcVs(data.jun.lcToLp, avg3M('lcToLp')),
        categoryRoas: calcVs(data.jun.categoryRoas, avg3M('categoryRoas')),
        overallRoas: calcVs(data.jun.overallRoas, avg3M('overallRoas')),
        cpw: calcVs(data.jun.cpw, avg3M('cpw'))
      };

      finalCampaigns.push(data);
    }

    for (const m of ['mar', 'apr', 'may', 'jun'] as const) {
      calcMetrics(totalObj[m]);
    }

    totalObj.vsLastMonth = {
      spend: calcVs(totalObj.jun.spend, totalObj.may.spend),
      impressions: calcVs(totalObj.jun.impressions, totalObj.may.impressions),
      lc: calcVs(totalObj.jun.lc, totalObj.may.lc),
      lp: calcVs(totalObj.jun.lp, totalObj.may.lp),
      walkin: calcVs(totalObj.jun.walkin, totalObj.may.walkin),
      cpm: calcVs(totalObj.jun.cpm, totalObj.may.cpm),
      cpc: calcVs(totalObj.jun.cpc, totalObj.may.cpc),
      ctr: calcVs(totalObj.jun.ctr, totalObj.may.ctr),
      lcToLp: calcVs(totalObj.jun.lcToLp, totalObj.may.lcToLp),
      categoryRoas: calcVs(totalObj.jun.categoryRoas, totalObj.may.categoryRoas),
      overallRoas: calcVs(totalObj.jun.overallRoas, totalObj.may.overallRoas),
      cpw: calcVs(totalObj.jun.cpw, totalObj.may.cpw)
    };

    const avg3MTotal = (key: string) => (totalObj.mar[key as keyof typeof totalObj.mar] as number + totalObj.apr[key as keyof typeof totalObj.apr] as number + totalObj.may[key as keyof typeof totalObj.may] as number) / 3;

    totalObj.vsAvg3M = {
      spend: calcVs(totalObj.jun.spend, avg3MTotal('spend')),
      impressions: calcVs(totalObj.jun.impressions, avg3MTotal('impressions')),
      lc: calcVs(totalObj.jun.lc, avg3MTotal('lc')),
      lp: calcVs(totalObj.jun.lp, avg3MTotal('lp')),
      walkin: calcVs(totalObj.jun.walkin, avg3MTotal('walkin')),
      cpm: calcVs(totalObj.jun.cpm, avg3MTotal('cpm')),
      cpc: calcVs(totalObj.jun.cpc, avg3MTotal('cpc')),
      ctr: calcVs(totalObj.jun.ctr, avg3MTotal('ctr')),
      lcToLp: calcVs(totalObj.jun.lcToLp, avg3MTotal('lcToLp')),
      categoryRoas: calcVs(totalObj.jun.categoryRoas, avg3MTotal('categoryRoas')),
      overallRoas: calcVs(totalObj.jun.overallRoas, avg3MTotal('overallRoas')),
      cpw: calcVs(totalObj.jun.cpw, avg3MTotal('cpw'))
    };

    return NextResponse.json({
      campaigns: finalCampaigns,
      total: totalObj
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
