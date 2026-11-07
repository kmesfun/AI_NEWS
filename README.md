# Live site

https://ai-news-nu-eight.vercel.app/

# AI News Terminal

A Bloomberg-style dashboard for tracking AI headlines, startup funding, semiconductor news, IPO activity, and AI-adjacent market movers in one live terminal view.

**Live site:** https://ai-news-nu-eight.vercel.app/

## Features

- **Market ticker** for 25 AI, cloud, and semiconductor names (NVDA, AMD, TSM, ASML, ARM, MSFT, GOOGL, META, CRWV, SNOW, and more), using live quotes from `yahoo-finance2`.
- **Categorized news panels** for Headlines, Agentic AI, AI Startups, Semiconductors, and IPO Watch, aggregated from 11+ RSS feeds (TechCrunch, The Verge, VentureBeat, MIT Technology Review, Wired, Ars Technica, Semiconductor Engineering, EE Times, Crunchbase News, Nasdaq, Hacker News). Feeds are fetched independently, so one failing feed does not take down the rest.
- **Bubble Watch**: a hand-curated set of AI-bubble indicators (valuation spread, private mega-round valuations, hyperscaler CapEx vs. AI revenue, Taiwan risk, HBM/DRAM pricing, insider selling, enterprise AI ROI, ETF momentum). Each has a severity (green, yellow, orange, red), a dot-com-era parallel, and a thesis. Live headlines are keyword-matched to the indicators they relate to. The readings are written by hand and are not computed from market data.
- **Earnings table**, **economic calendar** (a static, hand-maintained event list), and an **options calculator** (Black-Scholes).
- Server-side keyword categorization, duplicate filtering, and cached refreshes.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Route handlers under `app/api/*` fetch and cache data on the server; the page itself is a client component that polls those routes
- `rss-parser` for feeds, `yahoo-finance2` for quotes
- Deployed on Vercel; CI on GitHub Actions (type-check, build, lint, offline evals)

## Requirements

- Node.js 18 or newer
- npm
- Internet access for live RSS feeds and quote data

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For a production build, use `npm run build` and `npm start`. To use another port, run `PORT=3001 npm run dev`.

## API routes

- `GET /api/news`: categorized feed buckets (`top`, `agentic`, `startups`, `semiconductors`, `ipo`) with an `updatedAt` timestamp
- `GET /api/stocks`: current quotes with symbol, company name, price, change, percent change, and currency
- `GET /api/earnings`, `GET /api/calendar`, `GET /api/bubble`: earnings, calendar events, and Bubble Watch data

News is cached server-side for 10 minutes and refreshed by the client every 10 minutes. Stock quotes are cached for 30 seconds and refreshed by the client every 30 seconds. Earnings are cached for an hour.

## Testing

Lightweight evals check that data comes back in the expected shape and range:

```sh
npm run eval            # all evals
npm run eval:offline    # Black-Scholes put-call parity and calendar shape (no network)
npm run eval:network    # stocks, news, and bubble score (calls external APIs)
```

CI runs the type-check, build, lint, and the offline evals on every push and pull request to `main`.
