# AI News Terminal

Bloomberg-style aggregator for AI news with a live stock ticker.

## Features
- **Scrolling stock ticker** at the top — 25 AI / semiconductor names (NVDA, AMD, TSM, ASML, ARM, …) via Stooq.
- **Categorized news panels**: Headlines, Agentic AI, AI Startups, Semiconductors, IPO Watch.
- **Live RSS aggregation** from TechCrunch, The Verge, VentureBeat, MIT Tech Review, Wired, Ars Technica, Semi Engineering, EE Times, Crunchbase News, Nasdaq, Hacker News.
- Server-side keyword categorization, dedup, and caching.

## Run
```
npm install
npm start
```
Open http://localhost:3000.

## Endpoints
- `GET /api/news` — categorized feed buckets
- `GET /api/stocks` — current quotes + % change

News refreshes every 5 min (server cache 10 min). Quotes refresh every 30s.
