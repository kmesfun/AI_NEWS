import { unstable_cache } from 'next/cache';
import type { Quote } from './types';

const TICKERS = [
  'NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'ASML', 'MU', 'QCOM', 'ARM', 'SMCI',
  'MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA', 'PLTR', 'CRWV', 'AI', 'SOUN',
  'IBM', 'ORCL', 'NOW', 'SNOW', 'DDOG',
];

function parseStooqCsv(csv: string): Quote[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iSym = idx('symbol');
  const iClose = idx('close');
  const iPrev = idx('prev');
  const iName = idx('name');
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

async function fetchStocks(): Promise<Quote[]> {
  try {
    const symbolsParam = TICKERS.map((t) => `${t.toLowerCase()}.us`).join('+');
    const url = `https://stooq.com/q/l/?s=${symbolsParam}&f=sd2t2ohlcvnp&h&e=csv`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 AINewsTerminal/1.0' },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const list = parseStooqCsv(csv);
    const order = new Map(TICKERS.map((t, i) => [t, i]));
    return list.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));
  } catch (err) {
    console.warn('[stocks] failed:', (err as Error).message);
    return [];
  }
}

export const getStocks = unstable_cache(fetchStocks, ['stocks-data'], { revalidate: 30 });
