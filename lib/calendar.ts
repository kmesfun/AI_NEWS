import type { CalendarEvent } from './types';

const ECON_EVENTS: CalendarEvent[] = [
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

function isoDateET(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

export function getCalendar(): CalendarEvent[] {
  const today = isoDateET();
  return ECON_EVENTS
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 25);
}
