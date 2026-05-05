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

app.listen(PORT, () => {
  console.log(`AI News Terminal running on http://localhost:${PORT}`);
  getNews().catch(() => {});
  getStocks().catch(() => {});
});
