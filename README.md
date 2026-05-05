# AI News Terminal

A Bloomberg-style dashboard for tracking AI headlines, startup funding, semiconductor news, IPO activity, and AI-adjacent market movers in one live terminal view.

## Features

- Scrolling market ticker for 25 AI, cloud, and semiconductor names, including NVDA, AMD, TSM, ASML, ARM, MSFT, GOOGL, META, CRWV, and SNOW.
- Categorized news panels for Headlines, Agentic AI, AI Startups, Semiconductors, and IPO Watch.
- RSS aggregation from TechCrunch, The Verge, VentureBeat, MIT Technology Review, Wired, Ars Technica, Semiconductor Engineering, EE Times, Crunchbase News, Nasdaq, and Hacker News.
- Server-side keyword categorization, duplicate filtering, and cache-backed refreshes.
- Static frontend served by Express with no client-side build step.

## Requirements

- Node.js 18 or newer
- npm
- Internet access for live RSS feeds and Stooq quote data

## Run Locally

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

If port 3000 is already in use, start the server on another port:

```sh
PORT=3001 npm start
```

## API

- `GET /api/news` returns an `updatedAt` timestamp and categorized feed buckets: `top`, `agentic`, `startups`, `semiconductors`, and `ipo`.
- `GET /api/stocks` returns an `updatedAt` timestamp and current quote records with symbol, company name, price, price change, percent change, and currency.

News is cached server-side for 10 minutes and refreshed by the client every 5 minutes. Stock quotes are cached server-side for 30 seconds and refreshed by the client every 30 seconds.

## Testing

There is no automated test script yet. For a smoke test:

1. Start the server with `npm start`.
2. Visit the app in a browser and confirm the status changes to `LIVE`.
3. Check that the five news panels render and the market ticker contains quote symbols.
4. Verify the endpoints return HTTP 200:

```sh
curl -i http://localhost:3000/
curl -i http://localhost:3000/api/news
curl -i http://localhost:3000/api/stocks
```

Latest smoke test: passed on May 5, 2026 using port 3001 because port 3000 was already occupied. The homepage, news API, stocks API, and browser UI all loaded successfully with no console errors.
