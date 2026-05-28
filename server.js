const express = require('express');
const Parser = require('rss-parser');
const NodeCache = require('node-cache');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AINewsTerminal/1.0)' },
});

const newsCache = new NodeCache({ stdTTL: 600 });
const stockCache = new NodeCache({ stdTTL: 30 });
const earningsCache = new NodeCache({ stdTTL: 3600 });

const FEEDS = [
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'VentureBeat' },
  { url: 'https://www.technologyreview.com/feed/', source: 'MIT Tech Review' },
  { url: 'https://www.wired.com/feed/tag/ai/latest/rss', source: 'Wired' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica' },
  { url: 'https://semiengineering.com/feed/', source: 'Semi Engineering' },
  { url: 'https://www.eetimes.com/feed/', source: 'EE Times' },
  { url: 'https://news.crunchbase.com/feed/', source: 'Crunchbase News' },
  { url: 'https://techcrunch.com/category/venture/feed/', source: 'TechCrunch VC' },
  { url: 'https://www.nasdaq.com/feed/rssoutbound?category=IPOs', source: 'Nasdaq IPO' },
  { url: 'https://hnrss.org/newest?q=AI+OR+%22artificial+intelligence%22+OR+LLM&points=20', source: 'Hacker News' },
];

const TICKERS = [
  'NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'ASML', 'MU', 'QCOM', 'ARM', 'SMCI',
  'MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA', 'PLTR', 'CRWV', 'AI', 'SOUN',
  'IBM', 'ORCL', 'NOW', 'SNOW', 'DDOG',
];

const CATEGORIES = {
  agentic: {
    label: 'AGENTIC AI',
    keywords: ['agent', 'agentic', 'autonomous', 'multi-agent', 'copilot', 'assistant', 'claude', 'gpt', 'llm', 'reasoning model', 'tool use', 'computer use', 'browser use', 'workflow automation'],
  },
  startups: {
    label: 'AI STARTUPS',
    keywords: ['startup', 'series a', 'series b', 'series c', 'series d', 'seed round', 'funding round', 'raises $', 'raised $', 'venture', 'valuation', 'unicorn', 'y combinator', 'yc-backed'],
  },
  semiconductors: {
    label: 'SEMICONDUCTORS',
    keywords: ['chip', 'semiconductor', 'gpu', 'tpu', 'npu', 'silicon', 'foundry', 'tsmc', 'asml', 'nvidia', 'amd', 'intel', 'arm', 'wafer', 'lithography', 'fab', 'hbm', 'cuda', 'datacenter chip', 'ai accelerator'],
  },
  ipo: {
    label: 'IPO WATCH',
    keywords: ['ipo', 'initial public offering', 'going public', 'files to go public', 'direct listing', 's-1 filing', 'public offering', 'lists on nasdaq', 'lists on nyse', 'debut on'],
  },
};

function categorize(item) {
  const haystack = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`.toLowerCase();
  const matches = [];
  for (const [key, def] of Object.entries(CATEGORIES)) {
    if (def.keywords.some((kw) => haystack.includes(kw))) matches.push(key);
  }
  return matches;
}

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).slice(0, 25).map((item) => ({
      title: item.title?.trim(),
      link: item.link,
      source: feed.source,
      publishedAt: item.isoDate || item.pubDate,
      snippet: (item.contentSnippet || item.content || '').slice(0, 280),
    })).filter((i) => i.title && i.link);
  } catch (err) {
    console.warn(`[feed] ${feed.source} failed: ${err.message}`);
    return [];
  }
}

async function getNews() {
  const cached = newsCache.get('news');
  if (cached) return cached;

  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();

  const seen = new Set();
  const unique = all.filter((item) => {
    const key = item.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const grouped = { agentic: [], startups: [], semiconductors: [], ipo: [], top: [] };
  for (const item of unique) {
    const cats = categorize(item);
    if (cats.length === 0) continue;
    for (const cat of cats) {
      if (grouped[cat].length < 30) grouped[cat].push(item);
    }
  }
  grouped.top = unique.slice(0, 20);

  newsCache.set('news', grouped);
  return grouped;
}

function parseStooqCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);
  const iSym = idx('symbol');
  const iClose = idx('close');
  const iPrev = idx('prev');
  const iName = idx('name');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const symbolRaw = cols[iSym] || '';
    const symbol = symbolRaw.replace(/\.US$/i, '').toUpperCase();
    const price = parseFloat(cols[iClose]);
    const prev = parseFloat(cols[iPrev]);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(prev) || prev === 0) return null;
    const change = price - prev;
    const changePercent = (change / prev) * 100;
    return {
      symbol,
      name: (cols[iName] || symbol).trim(),
      price,
      change,
      changePercent,
      currency: 'USD',
    };
  }).filter(Boolean);
}

async function getStocks() {
  const cached = stockCache.get('stocks');
  if (cached) return cached;

  try {
    const symbolsParam = TICKERS.map((t) => `${t.toLowerCase()}.us`).join('+');
    const url = `https://stooq.com/q/l/?s=${symbolsParam}&f=sd2t2ohlcvnp&h&e=csv`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 AINewsTerminal/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const list = parseStooqCsv(csv);
    if (list.length) {
      const order = new Map(TICKERS.map((t, i) => [t, i]));
      list.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));
      stockCache.set('stocks', list);
    }
    return list;
  } catch (err) {
    console.warn('[stocks] failed:', err.message);
    return cached || [];
  }
}

// ---- Economic calendar (key US macro releases + AI/chip earnings) ----
// Times are US Eastern. Maintained as a static schedule; filtered to future events.
const ECON_EVENTS = [
  { date: '2026-05-12', time: '08:30', event: 'CPI (April)', kind: 'macro', importance: 'high' },
  { date: '2026-05-13', time: '08:30', event: 'PPI (April)', kind: 'macro', importance: 'medium' },
  { date: '2026-05-14', time: '08:30', event: 'Retail Sales (April)', kind: 'macro', importance: 'high' },
  { date: '2026-05-20', time: '14:00', event: 'FOMC Minutes', kind: 'fed', importance: 'high' },
  { date: '2026-05-20', time: '16:20', event: 'NVIDIA Earnings (Q1 FY27)', kind: 'earnings', importance: 'high' },
  { date: '2026-05-28', time: '08:30', event: 'Core PCE Price Index (April)', kind: 'macro', importance: 'high' },
  { date: '2026-06-05', time: '08:30', event: 'Nonfarm Payrolls (May)', kind: 'macro', importance: 'high' },
  { date: '2026-06-10', time: '08:30', event: 'CPI (May)', kind: 'macro', importance: 'high' },
  { date: '2026-06-11', time: '08:30', event: 'PPI (May)', kind: 'macro', importance: 'medium' },
  { date: '2026-06-17', time: '14:00', event: 'FOMC Rate Decision + SEP', kind: 'fed', importance: 'high' },
  { date: '2026-06-17', time: '08:30', event: 'Retail Sales (May)', kind: 'macro', importance: 'high' },
  { date: '2026-06-25', time: '08:30', event: 'Core PCE Price Index (May)', kind: 'macro', importance: 'high' },
  { date: '2026-07-02', time: '08:30', event: 'Nonfarm Payrolls (June)', kind: 'macro', importance: 'high' },
  { date: '2026-07-14', time: '08:30', event: 'CPI (June)', kind: 'macro', importance: 'high' },
  { date: '2026-07-15', time: '08:30', event: 'PPI (June)', kind: 'macro', importance: 'medium' },
  { date: '2026-07-16', time: '08:30', event: 'Retail Sales (June)', kind: 'macro', importance: 'high' },
  { date: '2026-07-22', time: '16:00', event: 'Alphabet, Tesla Earnings', kind: 'earnings', importance: 'high' },
  { date: '2026-07-29', time: '14:00', event: 'FOMC Rate Decision', kind: 'fed', importance: 'high' },
  { date: '2026-07-29', time: '16:00', event: 'Microsoft, Meta Earnings', kind: 'earnings', importance: 'high' },
  { date: '2026-07-30', time: '08:30', event: 'GDP Q2 Advance Estimate', kind: 'macro', importance: 'high' },
  { date: '2026-07-30', time: '08:30', event: 'Core PCE Price Index (June)', kind: 'macro', importance: 'high' },
  { date: '2026-07-30', time: '16:00', event: 'Apple, Amazon Earnings', kind: 'earnings', importance: 'high' },
  { date: '2026-08-07', time: '08:30', event: 'Nonfarm Payrolls (July)', kind: 'macro', importance: 'high' },
  { date: '2026-08-12', time: '08:30', event: 'CPI (July)', kind: 'macro', importance: 'high' },
  { date: '2026-08-13', time: '08:30', event: 'PPI (July)', kind: 'macro', importance: 'medium' },
  { date: '2026-08-14', time: '08:30', event: 'Retail Sales (July)', kind: 'macro', importance: 'high' },
  { date: '2026-08-26', time: '08:30', event: 'Core PCE Price Index (July)', kind: 'macro', importance: 'high' },
  { date: '2026-08-27', time: '16:20', event: 'NVIDIA Earnings (Q2 FY27)', kind: 'earnings', importance: 'high' },
  { date: '2026-09-04', time: '08:30', event: 'Nonfarm Payrolls (August)', kind: 'macro', importance: 'high' },
  { date: '2026-09-10', time: '08:30', event: 'PPI (August)', kind: 'macro', importance: 'medium' },
  { date: '2026-09-11', time: '08:30', event: 'CPI (August)', kind: 'macro', importance: 'high' },
  { date: '2026-09-16', time: '14:00', event: 'FOMC Rate Decision + SEP', kind: 'fed', importance: 'high' },
  { date: '2026-09-16', time: '08:30', event: 'Retail Sales (August)', kind: 'macro', importance: 'high' },
  { date: '2026-09-30', time: '08:30', event: 'Core PCE Price Index (August)', kind: 'macro', importance: 'high' },
  { date: '2026-10-02', time: '08:30', event: 'Nonfarm Payrolls (September)', kind: 'macro', importance: 'high' },
  { date: '2026-10-14', time: '08:30', event: 'CPI (September)', kind: 'macro', importance: 'high' },
  { date: '2026-10-15', time: '08:30', event: 'PPI (September)', kind: 'macro', importance: 'medium' },
  { date: '2026-10-15', time: '08:30', event: 'Retail Sales (September)', kind: 'macro', importance: 'high' },
  { date: '2026-10-28', time: '14:00', event: 'FOMC Rate Decision', kind: 'fed', importance: 'high' },
  { date: '2026-10-29', time: '08:30', event: 'GDP Q3 Advance Estimate', kind: 'macro', importance: 'high' },
  { date: '2026-10-29', time: '08:30', event: 'Core PCE Price Index (September)', kind: 'macro', importance: 'high' },
  { date: '2026-11-06', time: '08:30', event: 'Nonfarm Payrolls (October)', kind: 'macro', importance: 'high' },
  { date: '2026-11-10', time: '08:30', event: 'CPI (October)', kind: 'macro', importance: 'high' },
  { date: '2026-11-13', time: '08:30', event: 'PPI (October)', kind: 'macro', importance: 'medium' },
  { date: '2026-11-17', time: '08:30', event: 'Retail Sales (October)', kind: 'macro', importance: 'high' },
  { date: '2026-11-19', time: '16:20', event: 'NVIDIA Earnings (Q3 FY27)', kind: 'earnings', importance: 'high' },
  { date: '2026-11-25', time: '08:30', event: 'Core PCE Price Index (October)', kind: 'macro', importance: 'high' },
  { date: '2026-12-04', time: '08:30', event: 'Nonfarm Payrolls (November)', kind: 'macro', importance: 'high' },
  { date: '2026-12-09', time: '14:00', event: 'FOMC Rate Decision + SEP', kind: 'fed', importance: 'high' },
  { date: '2026-12-10', time: '08:30', event: 'CPI (November)', kind: 'macro', importance: 'high' },
  { date: '2026-12-15', time: '08:30', event: 'PPI (November)', kind: 'macro', importance: 'medium' },
  { date: '2026-12-16', time: '08:30', event: 'Retail Sales (November)', kind: 'macro', importance: 'high' },
  { date: '2026-12-23', time: '08:30', event: 'Core PCE Price Index (November)', kind: 'macro', importance: 'high' },
];

function getCalendar() {
  const todayIso = isoDateInTimeZone(new Date(), 'America/New_York');
  return ECON_EVENTS
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 25);
}

function isoDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function addDaysToIsoDate(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (_req, res) => {
  try {
    res.json({ updatedAt: new Date().toISOString(), data: await getNews() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stocks', async (_req, res) => {
  try {
    res.json({ updatedAt: new Date().toISOString(), data: await getStocks() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calendar', (_req, res) => {
  res.json({ updatedAt: new Date().toISOString(), data: getCalendar() });
});

// ---- S&P 500-tier earnings (next 7 days, market cap >= $10B proxy) ----
function parseMarketCap(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function fetchEarningsForDate(dateIso) {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateIso}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.data?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    date: dateIso,
    symbol: r.symbol,
    name: r.name,
    time: r.time, // time-pre-market | time-after-hours | time-not-supplied
    marketCap: parseMarketCap(r.marketCap),
    marketCapStr: r.marketCap,
    fiscalQuarter: r.fiscalQuarterEnding,
    epsForecast: r.epsForecast,
    lastYearEps: r.lastYearEPS,
    lastYearDate: r.lastYearRptDt,
    estimates: r.noOfEsts,
  })).filter((e) => e.symbol);
}

async function getEarnings() {
  const cached = earningsCache.get('earnings');
  if (cached) return cached;

  const todayIso = isoDateInTimeZone(new Date(), 'America/New_York');
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDaysToIsoDate(todayIso, i));
  }

  const results = await Promise.allSettled(dates.map(fetchEarningsForDate));
  const all = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // Top-500 proxy: market cap >= $10B
  const filtered = all
    .filter((e) => e.marketCap >= 10_000_000_000)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return b.marketCap - a.marketCap;
    });

  if (filtered.length) earningsCache.set('earnings', filtered);
  return filtered;
}

app.get('/api/earnings', async (_req, res) => {
  try {
    res.json({ updatedAt: new Date().toISOString(), data: await getEarnings() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- AI Bubble Watch ----
// Analysis by a veteran who watched the dot-com bubble from a trading desk.
// The Cisco Paradox: the technology was real; Cisco still fell 88%.
const BUBBLE_INDICATORS = [
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
    thesis: 'Texas Instruments rallying because "AI data centers need power management" is a late-cycle signal, not an early one. Broadening is good when fundamentals follow. It is dangerous when it is purely narrative-driven multiple expansion in companies with no direct AI revenue.',
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
    thesis: 'TSMC fabs every Blackwell, GB200, MI300, and advanced chip in the AI stack. If you believe AI is worth $30T in market cap, you must also believe Taiwan will remain peaceful indefinitely. The market does. That is a massive unpriced tail risk. Smart money hedges this with OTM puts on SOXX.',
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
    thesis: 'HBM is still tight because NVDA cannot get enough. The moment HBM lead times slip from 52 weeks to 30 weeks, it means GPU orders are softening 2 quarters ahead. Watch Micron and SK Hynix quarterly commentary obsessively. They will tell you before Nvidia does.',
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
    thesis: 'Jensen Huang knows the Blackwell cycle better than any analyst on Wall Street. He is on a systematic 10b5-1 selling plan. That is legal and pre-scheduled, but the size and consistency of insider sales at tech peaks is a reliable late-cycle indicator. Insiders are not selling because they think AI is fake. They are selling because they think the stock price has over-discounted the next 3 years.',
    implication: 'Not a crash indicator — a valuation sanity check from people with inside information.',
    keywords: ['insider', 'sold shares', '10b5-1', 'executive sold', 'ceo sold', 'jensen', 'disposed'],
    watchSymbols: ['NVDA', 'AMD', 'META'],
  },
  {
    id: 'enterprise_roi',
    label: 'Enterprise AI ROI Evidence',
    severity: 'yellow',
    reading: 'Productivity claims widespread; hard revenue attribution to AI sparse',
    dotcomParallel: 'By 2000, every Fortune 500 had a "dot-com strategy." Most added cost, not revenue. The narrative was unimpeachable ("the internet changes everything") but the ROI was not there yet. Companies eventually got the ROI — just not the ones that went public at 100x.',
    thesis: 'Goldman Sachs research found companies struggle to attribute revenue gains directly to AI spending. Microsoft Copilot adoption has been slower than expected. If enterprise AI ROI doesn\'t materialize in 2025-2026 earnings cycles, the narrative cracks — not because AI is fake but because the timeline was wrong.',
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
    thesis: 'ETF inflows into SOXX and SOXL (3x leveraged semi ETF) are accelerating. This creates the mechanical buying pressure that pushes stocks through fundamental resistance. It works brilliantly until it reverses — and the reversal is violent because SOXL redemptions force leveraged selling.',
    implication: 'SOXL flows reversing is one of the fastest-moving sentiment indicators available.',
    keywords: ['soxl', 'soxx', 'smh', 'etf inflow', 'retail buying', 'options', 'call', 'momentum', 'meme'],
    watchSymbols: ['SOXX', 'SOXL', 'SMH'],
  },
];

// Severity score: red=4, orange=3, yellow=2, green=1
const SEVERITY_SCORE = { red: 4, orange: 3, yellow: 2, green: 1 };

function getBubbleData(allNews) {
  const flat = Object.values(allNews).flat();
  const seen = new Set();
  const uniqueNews = flat.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // Tag each news item with matching indicators
  const taggedNews = [];
  for (const item of uniqueNews.slice(0, 200)) {
    const haystack = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
    const matchedIndicators = BUBBLE_INDICATORS.filter((ind) =>
      ind.keywords.some((kw) => haystack.includes(kw))
    ).map((ind) => ind.id);
    if (matchedIndicators.length) {
      taggedNews.push({ ...item, matchedIndicators });
    }
  }
  taggedNews.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  // Overall composite score
  const scores = BUBBLE_INDICATORS.map((i) => SEVERITY_SCORE[i.severity] || 1);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const compositeLabel =
    avgScore >= 3.5 ? 'DANGER' :
    avgScore >= 2.5 ? 'WARNING' :
    avgScore >= 1.5 ? 'ELEVATED' : 'CONTAINED';
  const compositeSeverity =
    avgScore >= 3.5 ? 'red' :
    avgScore >= 2.5 ? 'orange' :
    avgScore >= 1.5 ? 'yellow' : 'green';

  return {
    composite: { score: avgScore.toFixed(2), label: compositeLabel, severity: compositeSeverity },
    indicators: BUBBLE_INDICATORS,
    news: taggedNews.slice(0, 40),
    analystNote: 'Analysis framework by a veteran who managed through the 2000-02 dot-com collapse. The Cisco Paradox: the technology was real and transformative; Cisco still fell 88% from peak. Being right about AI does not protect you from valuation destruction. The key question is not "will AI be big?" but "how much growth is already priced in?"',
  };
}

app.get('/api/bubble', async (_req, res) => {
  try {
    const news = await getNews();
    res.json({ updatedAt: new Date().toISOString(), data: getBubbleData(news) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`AI News Terminal running on http://localhost:${PORT}`);
  getNews().catch(() => {});
  getStocks().catch(() => {});
  getEarnings().catch(() => {});
});
