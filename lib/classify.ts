const EXCLUDE_WORDS = ['chair', 'desk', 'sofa', 'elite', 'foot'];

export type Funnel = 'TOP' | 'MID' | 'BOTTOM' | 'RNF' | 'GROUP' | 'EXCLUDED';

// For Region Level — only exclude growth and boost
export function includeInRegion(campaignName: string): boolean {
  const cn = campaignName.toLowerCase();
  return !cn.includes('growth') && !cn.includes('boost');
}

// For 6 City — filter by BOTH campaign name AND adset name
export function classifyAdset(campaignName: string, adsetName: string): Funnel {
  const cn = (campaignName || '').toLowerCase();
  const an = (adsetName || '').toLowerCase();

  // Exclude if EITHER campaign OR adset name contains excluded words
  for (const word of EXCLUDE_WORDS) {
    if (cn.includes(word) || an.includes(word)) return 'EXCLUDED';
  }

  // Exclude growth and boost campaigns
  if (cn.includes('growth') || cn.includes('boost')) return 'EXCLUDED';

  // Classify by campaign name (first match wins)
  if (cn.includes('top') && !cn.includes('mid') && !cn.includes('bot')) return 'TOP';
  if (cn.includes('mid') && !cn.includes('group') && !cn.includes('bot')) return 'MID';
  if (cn.includes('bot')) return 'BOTTOM';
  if (cn.includes('rnf')) return 'RNF';
  if (cn.includes('group')) return 'GROUP';

  return 'EXCLUDED';
}
