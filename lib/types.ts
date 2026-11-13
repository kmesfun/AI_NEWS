export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet: string;
  matchedIndicators?: string[];
}

export interface NewsData {
  top: NewsItem[];
  agentic: NewsItem[];
  startups: NewsItem[];
  semiconductors: NewsItem[];
  ipo: NewsItem[];
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface EarningsRow {
  date: string;
  symbol: string;
  name: string;
  time: string;
  marketCap: number;
  marketCapStr: string;
  fiscalQuarter: string;
  epsForecast: string;
  lastYearEps: string;
  lastYearDate: string;
  estimates: string;
}

export interface CalendarEvent {
  date: string;
  time: string;
  event: string;
  kind: 'macro' | 'fed' | 'earnings' | 'ipo';
  importance: 'high' | 'medium' | 'low';
}

export type IpoStatus = 'roadshow' | 'filed' | 'not-filed';

export interface IpoPipelineItem {
  name: string;
  ticker?: string;
  status: IpoStatus;
  /** Expected timing as reported; free text because most have no firm date. */
  window: string;
  note: string;
  href?: string;
}

export interface BubbleIndicator {
  id: string;
  label: string;
  severity: 'green' | 'yellow' | 'orange' | 'red';
  reading: string;
  dotcomParallel: string;
  thesis: string;
  implication: string;
  keywords: string[];
  watchSymbols: string[];
}

export interface BubbleData {
  composite: { score: string; label: string; severity: string };
  indicators: BubbleIndicator[];
  news: (NewsItem & { matchedIndicators: string[] })[];
  analystNote: string;
}
