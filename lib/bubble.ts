import type { BubbleIndicator, BubbleData, NewsData } from './types';

export const BUBBLE_INDICATORS: BubbleIndicator[] = [
  {
    id: 'valuation_spread',
    label: 'SOX Valuation vs Historical Mean',
    severity: 'orange',
    reading: '~38x forward P/E vs ~20x 20-year avg',
    dotcomParallel: 'SOXX peaked at ~60x in March 2000 before an 80% collapse. 38x is elevated but not yet peak-euphoria. Danger zone begins around 45-50x.',
    thesis: 'Semis trade at a 90% premium to their historical mean multiple. This alone does not pop a bubble, but it means there is no margin of safety. A guidance cut that would cause a 10% drop in normal times causes 30% here.',
    implication: 'Any miss on guidance → outsized drawdown. No cushion.',
    keywords: ['p/e', 'valuation', 'overvalued', 'multiple', 'premium', 'price-to-earnings', 'stretched'],
    watchSymbols: ['SOXX', 'NVDA', 'AMD'],
  },
  {
    id: 'private_market_excess',
    label: 'Private AI Mega-Round Valuations',
    severity: 'red',
    reading: 'OpenAI $300B · Anthropic $61B · xAI $50B · CoreWeave IPO $23B+',
    dotcomParallel: 'Webvan ($375M Series B in 1999 with no path to profit) and eToys (IPO at $5.5B, revenues of $30M). Today\'s AI startups raise on "future compute demand" not current revenue. Same movie, different ticker.',
    thesis: 'These valuations imply revenue run-rates 5-10x what the companies are generating. They only work if AI monetization accelerates dramatically AND these companies become the winners. In 2000, everyone said the same about B2B e-commerce. Most were wrong.',
    implication: 'Private round markdowns trigger VC/LP panic → public market contagion.',
    keywords: ['anthropic', 'openai', 'xai', 'mistral', 'raises $', 'raised $', 'series', 'valuation', 'unicorn', 'funding round', 'coreweave'],
    watchSymbols: ['CRWV', 'AI', 'PLTR'],
  },
  {
    id: 'capex_monetization_gap',
    label: 'Hyperscaler CapEx vs AI Revenue Gap',
    severity: 'orange',
    reading: 'MSFT/GOOGL/META CapEx +50-70% YoY; AI incremental revenue ~15-20% YoY',
    dotcomParallel: 'Telecom companies spent $750B building fiber networks 1997-2001. Bandwidth demand was real. Prices collapsed 99%. The question is not "is the demand real?" but "who captures the economics?"',
    thesis: 'The hyperscalers are building infrastructure for AI revenue that is not yet materializing at the required scale. If even one of them signals a CapEx pause — the semiconductor supply chain snaps. These stocks are priced for spending acceleration, not just continuation.',
    implication: 'CapEx guidance cut = -20% to -35% in NVDA/AMD/AVGO within weeks.',
    keywords: ['capex', 'data center', 'infrastructure spending', 'azure', 'aws', 'google cloud', 'microsoft ai', 'meta ai', 'investment', 'buildout', 'spending'],
    watchSymbols: ['MSFT', 'GOOGL', 'META', 'AMZN'],
  },
  {
    id: 'picks_shovels_breadth',
    label: 'Rally Breadth: Picks & Shovels Expansion',
    severity: 'orange',
    reading: 'TI, power semis, PCB, analog, cooling, HVAC adjacent names up 30-80% on AI adjacency',
    dotcomParallel: 'In 1999, UPS rallied on "e-commerce needs delivery." Elevator companies rallied because "dot-coms need offices." When the AI trade reaches air-conditioning stocks, you are at maximum narrative expansion.',
    thesis: 'Texas Instruments rallying because "AI data centers need power management" is a late-cycle signal, not an early one. Broadening is good when fundamentals follow. It is dangerous when it is purely narrative-driven multiple expansion.',
    implication: 'The broadened names fall first and fastest when the tide turns.',
    keywords: ['power management', 'analog', 'cooling', 'networking chips', 'pcb', 'picks and shovels', 'texas instruments', 'broadened', 'adjacent', 'supply chain'],
    watchSymbols: ['TXN', 'AMAT', 'LRCX', 'KLAC'],
  },
  {
    id: 'taiwan_risk_unpriced',
    label: 'Taiwan Geopolitical Risk (Unpriced)',
    severity: 'red',
    reading: 'TSMC = 90%+ of advanced AI chip production. Market risk premium: ~0.',
    dotcomParallel: 'There is no dot-com parallel. This is worse. A Taiwan conflict does not just cause a drawdown — it ends the AI buildout for 5+ years. The entire semiconductor supply chain routes through a 35km strait.',
    thesis: 'TSMC fabs every Blackwell, GB200, MI300, and advanced chip in the AI stack. If you believe AI is worth $30T in market cap, you must also believe Taiwan will remain peaceful indefinitely. The market does. That is a massive unpriced tail risk.',
    implication: 'Taiwan escalation = instantaneous -40% to -60% across the sector.',
    keywords: ['taiwan', 'tsmc', 'china', 'strait', 'geopolit', 'conflict', 'export control', 'restriction', 'tariff', 'ban', 'military'],
    watchSymbols: ['TSM', 'NVDA', 'ASML'],
  },
  {
    id: 'hbm_memory_pricing',
    label: 'HBM / DRAM Pricing (Canary Signal)',
    severity: 'yellow',
    reading: 'HBM3e still allocation-constrained; DDR5 DRAM softening in spots',
    dotcomParallel: 'DRAM crashed 90% in 2001 as the telecom buildout collapsed. Memory is always the first to crack when hyperscaler orders slow because it has the shortest lead times and the highest operating leverage.',
    thesis: 'HBM is still tight because NVDA cannot get enough. The moment HBM lead times slip from 52 weeks to 30 weeks, it means GPU orders are softening 2 quarters ahead. Watch Micron and SK Hynix quarterly commentary obsessively.',
    implication: 'HBM pricing softness → MU -15% → NVDA -10% → sector repricing.',
    keywords: ['hbm', 'high bandwidth memory', 'dram', 'memory pricing', 'micron', 'sk hynix', 'samsung memory', 'nand', 'bandwidth', 'allocation'],
    watchSymbols: ['MU', 'SMCI', 'NVDA'],
  },
  {
    id: 'insider_disposition',
    label: 'Insider Selling by AI Executives',
    severity: 'orange',
    reading: 'NVDA insiders ~$700M+ sold 2024-25; AMD, META executives on 10b5-1 plans',
    dotcomParallel: 'Cisco executives sold heavily into 1999-2000 peak. John Chambers sold while publicly declaring the internet would be "as big as the industrial revolution." The insiders knew the valuation was stretched even as the thesis was correct.',
    thesis: 'Jensen Huang knows the Blackwell cycle better than any analyst on Wall Street. He is on a systematic 10b5-1 selling plan. Insiders are not selling because they think AI is fake. They are selling because they think the stock price has over-discounted the next 3 years.',
    implication: 'Not a crash indicator — a valuation sanity check from people with inside information.',
    keywords: ['insider', 'sold shares', '10b5-1', 'executive sold', 'ceo sold', 'jensen', 'disposed'],
    watchSymbols: ['NVDA', 'AMD', 'META'],
  },
  {
    id: 'enterprise_roi',
    label: 'Enterprise AI ROI Evidence',
    severity: 'yellow',
    reading: 'Productivity claims widespread; hard revenue attribution to AI sparse',
    dotcomParallel: 'By 2000, every Fortune 500 had a "dot-com strategy." Most added cost, not revenue. Companies eventually got the ROI — just not the ones that went public at 100x.',
    thesis: 'Goldman Sachs research found companies struggle to attribute revenue gains directly to AI spending. Microsoft Copilot adoption has been slower than expected. If enterprise AI ROI doesn\'t materialize in 2025-2026 earnings cycles, the narrative cracks.',
    implication: 'AI ROI skepticism → SaaS/enterprise AI multiple compression → downstream semi demand revisions.',
    keywords: ['roi', 'return on investment', 'productivity', 'copilot adoption', 'enterprise ai', 'ai savings', 'efficiency gain', 'cost reduction', 'benchmark', 'disappointing'],
    watchSymbols: ['MSFT', 'NOW', 'SNOW', 'DDOG'],
  },
  {
    id: 'momentum_feedback_loop',
    label: 'ETF Momentum Feedback Loop',
    severity: 'yellow',
    reading: 'SOXX/SMH/SOXL inflows accelerating; retail options flow heavily bullish',
    dotcomParallel: '401k inflows into Janus, AIM, and PBHG in 1999 created a self-reinforcing loop: flows → QQQ → Cisco/Intel/MSFT → higher prices → more flows. The mechanism is identical today with passive ETF inflows.',
    thesis: 'ETF inflows into SOXX and SOXL (3x leveraged semi ETF) are accelerating. It works brilliantly until it reverses — and the reversal is violent because SOXL redemptions force leveraged selling.',
    implication: 'SOXL flows reversing is one of the fastest-moving sentiment indicators available.',
    keywords: ['soxl', 'soxx', 'smh', 'etf inflow', 'retail buying', 'options', 'call', 'momentum', 'meme'],
    watchSymbols: ['SOXX', 'SOXL', 'SMH'],
  },
];

const SEVERITY_SCORE: Record<string, number> = { red: 4, orange: 3, yellow: 2, green: 1 };

export function getBubbleData(allNews: NewsData): BubbleData {
  const flat = Object.values(allNews).flat();
  const seen = new Set<string>();
  const unique = flat.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  const taggedNews = unique.slice(0, 200).map((item) => {
    const haystack = `${item.title} ${item.snippet}`.toLowerCase();
    const matchedIndicators = BUBBLE_INDICATORS
      .filter((ind) => ind.keywords.some((kw) => haystack.includes(kw)))
      .map((ind) => ind.id);
    return matchedIndicators.length ? { ...item, matchedIndicators } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  taggedNews.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  const scores = BUBBLE_INDICATORS.map((i) => SEVERITY_SCORE[i.severity] ?? 1);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const compositeLabel = avgScore >= 3.5 ? 'DANGER' : avgScore >= 2.5 ? 'WARNING' : avgScore >= 1.5 ? 'ELEVATED' : 'CONTAINED';
  const compositeSeverity = avgScore >= 3.5 ? 'red' : avgScore >= 2.5 ? 'orange' : avgScore >= 1.5 ? 'yellow' : 'green';

  return {
    composite: { score: avgScore.toFixed(2), label: compositeLabel, severity: compositeSeverity },
    indicators: BUBBLE_INDICATORS,
    news: taggedNews.slice(0, 40),
    analystNote: 'Analysis framework by a veteran who managed through the 2000-02 dot-com collapse. The Cisco Paradox: the technology was real and transformative; Cisco still fell 88% from peak. Being right about AI does not protect you from valuation destruction. The key question is not "will AI be big?" but "how much growth is already priced in?"',
  };
}
