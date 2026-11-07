import type { Quote } from './types';

const TICKERS = [
  'NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'ASML', 'MU', 'QCOM', 'ARM', 'SMCI',
  'MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA', 'PLTR', 'CRWV', 'AI', 'SOUN',
  'IBM', 'ORCL', 'NOW', 'SNOW', 'DDOG',
];

interface YahooQuoteResult {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

async function fetchFromYahoo(): Promise<Quote[]> {
  const symbols = TICKERS.join(',');
  const fields = 'symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency';
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=${fields}&corsDomain=finance.yahoo.com`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://finance.yahoo.com',
      'Referer': 'https://finance.yahoo.com/',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);

  const json = await res.json();
  const results: YahooQuoteResult[] = json?.quoteResponse?.result ?? [];
  if (!results.length) throw new Error('Yahoo Finance returned empty results');

  return results
    .map((r) => {
      const price = r.regularMarketPrice ?? 0;
      const change = r.regularMarketChange ?? 0;
      const changePercent = r.regularMarketChangePercent ?? 0;
      if (!price) return null;
      return {
        symbol: r.symbol,
        name: r.shortName ?? r.symbol,
        price,
        change,
        changePercent,
        currency: r.currency ?? 'USD',
      } satisfies Quote;
    })
    .filter((q): q is Quote => q !== null);
}

function parseStooqCsv(csv: string): Quote[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iSym = idx('symbol'), iClose = idx('close'), iPrev = idx('prev'), iName = idx('name');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const symbol = (cols[iSym] || '').replace(/\.US$/i, '').toUpperCase();
    const price = parseFloat(cols[iClose]);
    const prev = parseFloat(cols[iPrev]);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(prev) || prev === 0) return null;
    const change = price - prev;
    const changePercent = (change / prev) * 100;
    return { symbol, name: (cols[iName] || symbol).trim(), price, change, changePercent, currency: 'USD' } satisfies Quote;
  }).filter((q): q is Quote => q !== null);
}

async function fetchFromStooq(): Promise<Quote[]> {
  const symbolsParam = TICKERS.map((t) => `${t.toLowerCase()}.us`).join('+');
  const url = `https://stooq.com/q/l/?s=${symbolsParam}&f=sd2t2ohlcvnp&h&e=csv`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 AINewsTerminal/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const csv = await res.text();
  const list = parseStooqCsv(csv);
  if (!list.length) throw new Error('Stooq returned empty CSV');
  const order = new Map(TICKERS.map((t, i) => [t, i]));
  return list.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));
}

export async function fetchStocks(): Promise<Quote[]> {
  // Try Yahoo Finance first (more reliable from cloud/Vercel IPs)
  try {
    const quotes = await fetchFromYahoo();
    console.log(`[stocks] Yahoo Finance: ${quotes.length} quotes`);
    return quotes;
  } catch (err) {
    console.warn('[stocks] Yahoo Finance failed:', (err as Error).message);
  }

  // Fall back to Stooq
  try {
    const quotes = await fetchFromStooq();
    console.log(`[stocks] Stooq fallback: ${quotes.length} quotes`);
    return quotes;
  } catch (err) {
    console.warn('[stocks] Stooq fallback failed:', (err as Error).message);
  }

  return [];
}

// Legacy export kept for any direct imports
export const getStocks = fetchStocks;
