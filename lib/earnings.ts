import { unstable_cache } from 'next/cache';
import type { EarningsRow } from './types';

function parseMarketCap(str: string): number {
  const n = parseFloat(String(str || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isoDateET(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

function addDays(iso: string, days: number): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

async function fetchEarningsForDate(dateIso: string): Promise<EarningsRow[]> {
  const res = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${dateIso}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.data?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((r: Record<string, string>) => ({
    date: dateIso,
    symbol: r.symbol ?? '',
    name: r.name ?? '',
    time: r.time ?? '',
    marketCap: parseMarketCap(r.marketCap ?? ''),
    marketCapStr: r.marketCap ?? '',
    fiscalQuarter: r.fiscalQuarterEnding ?? '',
    epsForecast: r.epsForecast ?? '',
    lastYearEps: r.lastYearEPS ?? '',
    lastYearDate: r.lastYearRptDt ?? '',
    estimates: r.noOfEsts ?? '',
  })).filter((e) => e.symbol);
}

async function fetchEarnings(): Promise<EarningsRow[]> {
  const today = isoDateET();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const results = await Promise.allSettled(dates.map(fetchEarningsForDate));
  const all = results
    .filter((r): r is PromiseFulfilledResult<EarningsRow[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
  return all
    .filter((e) => e.marketCap >= 10_000_000_000)
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : b.marketCap - a.marketCap);
}

export const getEarnings = unstable_cache(fetchEarnings, ['earnings-data'], { revalidate: 3600 });
