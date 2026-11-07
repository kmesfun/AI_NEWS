import YahooFinance from 'yahoo-finance2';
import type { Quote } from './types';

export const TICKERS = [
  'NVDA', 'AMD', 'INTC', 'TSM', 'AVGO', 'ASML', 'MU', 'QCOM', 'ARM', 'SMCI',
  'MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA', 'PLTR', 'CRWV', 'AI', 'SOUN',
  'IBM', 'ORCL', 'NOW', 'SNOW', 'DDOG',
];

// Suppress the survey notice
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function fetchStocks(): Promise<Quote[]> {
  try {
    const results = await yf.quote(TICKERS);
    const quotes: Quote[] = results
      .map((r) => {
        const price = r.regularMarketPrice ?? 0;
        const change = r.regularMarketChange ?? 0;
        const changePercent = r.regularMarketChangePercent ?? 0;
        if (!price) return null;
        return {
          symbol: r.symbol,
          name: (r.shortName ?? r.symbol).replace(/,? Inc\.?$/i, ''),
          price,
          change,
          changePercent,
          currency: r.currency ?? 'USD',
        } satisfies Quote;
      })
      .filter((q): q is Quote => q !== null);

    console.log(`[stocks] yahoo-finance2: ${quotes.length} quotes`);
    return quotes;
  } catch (err) {
    console.error('[stocks] yahoo-finance2 failed:', (err as Error).message);
    return [];
  }
}

export const getStocks = fetchStocks;
