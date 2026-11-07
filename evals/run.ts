/**
 * Evals for AI News Terminal
 *
 * Run with:  npm run eval
 *
 * Each eval is a lightweight contract check: does the system return
 * data in the shape and range we expect?  No external test runner
 * required — just tsx + built-in assertions.
 */

import assert from 'node:assert/strict';

// ─── helpers ────────────────────────────────────────────────────────────────

type EvalResult = { name: string; ok: boolean; error?: string; ms: number };

async function run(
  name: string,
  fn: () => Promise<void>,
): Promise<EvalResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - start };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    };
  }
}

// ─── evals ──────────────────────────────────────────────────────────────────

/**
 * Stocks — fetchStocks() must return at least one quote with the required
 * fields and sensible numeric values.
 */
async function evalStocks() {
  // Dynamic import so we get the actual compiled source
  const { fetchStocks } = await import('../lib/stocks.js');
  const quotes = await fetchStocks();

  assert.ok(Array.isArray(quotes), 'fetchStocks should return an array');
  assert.ok(quotes.length > 0, 'fetchStocks returned empty array — data source unreachable?');

  const q = quotes[0];
  assert.ok(typeof q.symbol === 'string' && q.symbol.length > 0, 'quote.symbol must be a non-empty string');
  assert.ok(typeof q.price === 'number' && isFinite(q.price) && q.price > 0, `quote.price must be a positive number, got ${q.price}`);
  assert.ok(typeof q.change === 'number' && isFinite(q.change), 'quote.change must be a finite number');
  assert.ok(typeof q.changePercent === 'number' && isFinite(q.changePercent), 'quote.changePercent must be a finite number');
  assert.ok(Math.abs(q.changePercent) < 100, `changePercent=${q.changePercent} looks implausible (>100%)`);
}

/**
 * Stocks — shape check for every ticker we care about.
 */
async function evalStocksTickers() {
  const { fetchStocks } = await import('../lib/stocks.js');
  const quotes = await fetchStocks();
  const symbols = new Set(quotes.map(q => q.symbol.toUpperCase()));

  // Core tickers we always expect to have data for
  const coreTickers = ['NVDA', 'AMD', 'AAPL', 'MSFT', 'TSLA'];
  const matched = coreTickers.filter(t => symbols.has(t));
  assert.ok(
    matched.length >= Math.ceil(coreTickers.length / 2),
    `Only ${matched.length}/${coreTickers.length} core tickers returned: ${matched.join(',')}`,
  );
}

/**
 * News — getNews() must return objects with the required NewsItem fields.
 */
async function evalNews() {
  const { getNews } = await import('../lib/feeds.js');
  const data = await getNews();

  assert.ok(data && typeof data === 'object', 'getNews should return an object');

  const categories = ['top', 'agentic', 'startups', 'semiconductors', 'ipo'] as const;
  for (const cat of categories) {
    const items = data[cat] as unknown[];
    assert.ok(Array.isArray(items), `data.${cat} should be an array`);
    // Not failing if a category is empty — feeds can go quiet
    if (items.length > 0) {
      const item = items[0] as Record<string, unknown>;
      assert.ok(typeof item.title === 'string' && item.title.length > 0, `${cat}[0].title must be a non-empty string`);
      assert.ok(typeof item.link === 'string' && item.link.startsWith('http'), `${cat}[0].link must be an http URL`);
    }
  }
}

/**
 * Bubble — getBubbleData() must return a numeric composite score 0-100.
 */
async function evalBubble() {
  const { getBubbleData } = await import('../lib/bubble.js');
  const { getNews } = await import('../lib/feeds.js');

  const newsData = await getNews();
  const bubble = getBubbleData(newsData);

  assert.ok(bubble && typeof bubble === 'object', 'getBubbleData should return an object');
  assert.ok(bubble.composite && typeof bubble.composite === 'object', 'bubble.composite must be an object');
  const score = Number(bubble.composite.score);
  assert.ok(!isNaN(score) && score >= 0 && score <= 100, `bubble.composite.score=${bubble.composite.score} must be numeric in [0,100]`);
  assert.ok(Array.isArray(bubble.indicators), 'bubble.indicators should be an array');
}

/**
 * Calendar — getCalendarEvents() must return upcoming events with valid dates.
 */
async function evalCalendar() {
  const { getCalendar } = await import('../lib/calendar.js');
  const events = getCalendar();

  assert.ok(Array.isArray(events), 'getCalendarEvents should return an array');
  // Calendar has hardcoded 2026 events so it should always have items
  assert.ok(events.length > 0, 'getCalendarEvents returned empty — check lib/calendar.ts');

  const ev = events[0];
  assert.ok(typeof ev.date === 'string', 'event.date must be a string');
  assert.ok(typeof ev.event === 'string' && ev.event.length > 0, 'event.event must be non-empty');
}

/**
 * Black-Scholes sanity — inline math check (no import needed).
 * Validates put-call parity: C - P ≈ S*e^(-qT) - K*e^(-rT)
 */
async function evalBlackScholesParity() {
  // Simple erf approximation (Horner's method, A&S 7.1.26)
  function erf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const poly =
      t * (0.254829592 +
        t * (-0.284496736 +
          t * (1.421413741 +
            t * (-1.453152027 +
              t * 1.061405429))));
    const val = 1 - poly * Math.exp(-(x * x));
    return x >= 0 ? val : -val;
  }
  function normCDF(x: number) { return (1 + erf(x / Math.SQRT2)) / 2; }

  function bs(S: number, K: number, T: number, r: number, sigma: number) {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const call = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    const put = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
    return { call, put };
  }

  // ATM option, 30-day, 25% IV, 5% rate
  const { call, put } = bs(100, 100, 30 / 365, 0.05, 0.25);
  const parity = call - put;
  const expected = 100 - 100 * Math.exp(-0.05 * (30 / 365));
  assert.ok(Math.abs(parity - expected) < 0.01, `Put-call parity violated: ${parity.toFixed(4)} vs ${expected.toFixed(4)}`);
  assert.ok(call > 0 && put > 0, 'Both call and put should be positive for ATM');
  assert.ok(call > put, 'Call > put when slightly ITM (rate effect)');
}

// ─── runner ─────────────────────────────────────────────────────────────────

async function main() {
  const evals = [
    run('stocks:fetchStocks shape', evalStocks),
    run('stocks:tickers coverage', evalStocksTickers),
    run('news:getNews shape', evalNews),
    run('bubble:getBubbleData score range', evalBubble),
    run('calendar:getCalendarEvents shape', evalCalendar),
    run('black-scholes:put-call parity', evalBlackScholesParity),
  ];

  const results = await Promise.allSettled(evals);
  const resolved = results.map(r =>
    r.status === 'fulfilled' ? r.value : { name: 'unknown', ok: false, error: String(r.reason), ms: 0 },
  );

  console.log('\n━━━ Eval Results ━━━\n');
  let passed = 0;
  let failed = 0;
  for (const r of resolved) {
    const icon = r.ok ? '✓' : '✗';
    const timing = `${r.ms}ms`;
    if (r.ok) {
      console.log(`  ${icon}  ${r.name}  (${timing})`);
      passed++;
    } else {
      console.error(`  ${icon}  ${r.name}  (${timing})\n     ${r.error}`);
      failed++;
    }
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
