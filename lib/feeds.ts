import Parser from 'rss-parser';
import { unstable_cache } from 'next/cache';
import type { NewsData, NewsItem } from './types';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AINewsTerminal/1.0)' },
});

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

const CATEGORIES: Record<string, { keywords: string[] }> = {
  agentic: {
    keywords: ['agent', 'agentic', 'autonomous', 'multi-agent', 'copilot', 'assistant', 'claude', 'gpt', 'llm', 'reasoning model', 'tool use', 'computer use', 'browser use', 'workflow automation'],
  },
  startups: {
    keywords: ['startup', 'series a', 'series b', 'series c', 'series d', 'seed round', 'funding round', 'raises $', 'raised $', 'venture', 'valuation', 'unicorn', 'y combinator', 'yc-backed'],
  },
  semiconductors: {
    keywords: ['chip', 'semiconductor', 'gpu', 'tpu', 'npu', 'silicon', 'foundry', 'tsmc', 'asml', 'nvidia', 'amd', 'intel', 'arm', 'wafer', 'lithography', 'fab', 'hbm', 'cuda', 'datacenter chip', 'ai accelerator'],
  },
  ipo: {
    keywords: ['ipo', 'initial public offering', 'going public', 'files to go public', 'direct listing', 's-1 filing', 'public offering', 'lists on nasdaq', 'lists on nyse', 'debut on'],
  },
};

function categorize(item: NewsItem): string[] {
  const haystack = `${item.title} ${item.snippet}`.toLowerCase();
  return Object.entries(CATEGORIES)
    .filter(([, def]) => def.keywords.some((kw) => haystack.includes(kw)))
    .map(([key]) => key);
}

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).slice(0, 25).map((item) => ({
      title: item.title?.trim() ?? '',
      link: item.link ?? '',
      source: feed.source,
      publishedAt: item.isoDate ?? item.pubDate ?? '',
      snippet: (item.contentSnippet ?? item.content ?? '').slice(0, 280),
    })).filter((i) => i.title && i.link);
  } catch (err) {
    console.warn(`[feed] ${feed.source} failed:`, (err as Error).message);
    return [];
  }
}

async function fetchAllNews(): Promise<NewsData> {
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();

  const seen = new Set<string>();
  const unique = all.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  unique.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  const grouped: NewsData = { agentic: [], startups: [], semiconductors: [], ipo: [], top: [] };
  for (const item of unique) {
    const cats = categorize(item);
    if (!cats.length) continue;
    for (const cat of cats) {
      const key = cat as keyof Omit<NewsData, 'top'>;
      if (grouped[key].length < 30) grouped[key].push(item);
    }
  }
  grouped.top = unique.slice(0, 20);
  return grouped;
}

export const getNews = unstable_cache(fetchAllNews, ['news-data'], { revalidate: 600 });
