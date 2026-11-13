/**
 * Evals for AI News Terminal
 *
 * Run with:
 *   npm run eval            — all evals (offline + network)
 *   npm run eval:offline    — only evals that never need network
 *   npm run eval:network    — only evals that call external APIs
 *
 * Each eval is a lightweight contract check: does the system return
 * data in the shape and range we expect?  No external test runner
 * required — just tsx + built-in assertions.
 */

import assert from 'node:assert/strict';

// ─── helpers ────────────────────────────────────────────────────────────────

type EvalKind = 'offline' | 'network';
type EvalResult = { name: string; ok: boolean; error?: string; ms: number; kind: EvalKind };

async function run(
  name: string,
  kind: EvalKind,
  fn: () => Promise<void>,
): Promise<EvalResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - start, kind };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
      kind,
    };
  }
}

// ─── offline evals (always run in CI) ───────────────────────────────────────

/**
 * Black-Scholes sanity — inline math check.
 * Validates put-call parity: C - P ≈ S - K*e^(-rT)
 */
async function evalBlackScholesParity() {
  const { blackScholes } = await import('../lib/options.js');
  const bs = blackScholes(100, 100, 30 / 365, 0.05, 0.25);
  assert.ok(bs, 'blackScholes returned null for valid inputs');
  const parity = bs.callPrice - bs.putPrice;
  const expected = 100 - 100 * Math.exp(-0.05 * (30 / 365));
  assert.ok(Math.abs(parity - expected) < 0.01, `Put-call parity violated: ${parity.toFixed(4)} vs ${expected.toFixed(4)}`);
  assert.ok(bs.callPrice > 0 && bs.putPrice > 0, 'Both call and put must be positive for ATM');
  assert.ok(bs.callPrice > bs.putPrice, 'Call > put when r > 0 (carry effect)');
}

/**
 * Covered call — payoff must equal stock P&L plus short-call P&L, with
 * profit capped at (K - S + premium) and breakeven at S - premium.
 */
async function evalCoveredCall() {
  const { blackScholes, payoff, positionStats } = await import('../lib/options.js');
  const S = 100, K = 105, T = 30 / 365, r = 0.045, sigma = 0.4;
  const bs = blackScholes(S, K, T, r, sigma);
  assert.ok(bs, 'blackScholes returned null');
  const prem = bs.callPrice;
  const stats = positionStats('covered-call', S, K, prem, T, r, sigma);

  assert.ok(Math.abs(stats.maxProfit - (K - S + prem)) < 1e-9, 'maxProfit should be K - S + premium');
  assert.ok(Math.abs(payoff('covered-call', S, K, prem, 150) - stats.maxProfit) < 1e-9, 'profit must be capped above the strike');
  assert.ok(Math.abs(payoff('covered-call', S, K, prem, stats.breakeven)) < 1e-9, 'payoff at breakeven must be zero');
  assert.ok(Math.abs(payoff('covered-call', S, K, prem, 0) + stats.maxLoss) < 1e-9, 'loss at $0 must equal maxLoss');
  for (const p of [60, 95, 100, 104, 110, 140]) {
    const direct = (p - S) - Math.max(0, p - K) + prem;
    assert.ok(Math.abs(payoff('covered-call', S, K, prem, p) - direct) < 1e-9, `payoff mismatch at ${p}`);
  }
  assert.ok(stats.chanceOfProfit > 0.5 && stats.chanceOfProfit < 1, `chanceOfProfit=${stats.chanceOfProfit} implausible`);
  assert.ok((stats.chanceAssigned ?? 2) < stats.chanceOfProfit, 'assignment (above K) must be less likely than profit (above S - premium)');
}

/**
 * Calendar — getCalendar() uses hardcoded data, never hits the network.
 */
async function evalCalendar() {
  const { getCalendar } = await import('../lib/calendar.js');
  const events = getCalendar();
  assert.ok(Array.isArray(events) && events.length > 0, 'getCalendar should return a non-empty array');
  const ev = events[0];
  assert.ok(typeof ev.date === 'string' && ev.date.length > 0, 'event.date must be a non-empty string');
  assert.ok(typeof ev.event === 'string' && ev.event.length > 0, 'event.event must be non-empty');
  assert.ok(['macro', 'fed', 'earnings', 'ipo'].includes(ev.kind), `event.kind must be a valid kind, got ${ev.kind}`);
}

// ─── network evals (best-effort; don't block CI) ─────────────────────────────

/**
 * Stocks — fetchStocks() must return at least one quote with the required fields.
 */
async function evalStocks() {
  const { fetchStocks } = await import('../lib/stocks.js');
  const quotes = await fetchStocks();
  assert.ok(Array.isArray(quotes) && quotes.length > 0, 'fetchStocks returned empty — data source unreachable?');
  const q = quotes[0];
  assert.ok(typeof q.symbol === 'string' && q.symbol.length > 0, 'quote.symbol must be non-empty');
  assert.ok(typeof q.price === 'number' && q.price > 0, `quote.price must be a positive number, got ${q.price}`);
  assert.ok(typeof q.change === 'number' && isFinite(q.change), 'quote.change must be finite');
  assert.ok(typeof q.changePercent === 'number' && Math.abs(q.changePercent) < 100, `changePercent=${q.changePercent} looks implausible`);
}

/**
 * Stocks — coverage check: at least half of core tickers must be returned.
 */
async function evalStocksTickers() {
  const { fetchStocks } = await import('../lib/stocks.js');
  const quotes = await fetchStocks();
  const symbols = new Set(quotes.map(q => q.symbol.toUpperCase()));
  const coreTickers = ['NVDA', 'AMD', 'AAPL', 'MSFT', 'TSLA'];
  const matched = coreTickers.filter(t => symbols.has(t));
  assert.ok(matched.length >= 3, `Only ${matched.length}/${coreTickers.length} core tickers returned: ${matched.join(',')}`);
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
    const items = data[cat];
    assert.ok(Array.isArray(items), `data.${cat} should be an array`);
    if (items.length > 0) {
      const item = items[0];
      assert.ok(typeof item.title === 'string' && item.title.length > 0, `${cat}[0].title must be non-empty`);
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
  assert.ok(bubble?.composite && typeof bubble.composite === 'object', 'bubble.composite must be an object');
  const score = Number(bubble.composite.score);
  assert.ok(!isNaN(score) && score >= 0 && score <= 100, `composite.score=${bubble.composite.score} must be numeric in [0,100]`);
  assert.ok(Array.isArray(bubble.indicators) && bubble.indicators.length > 0, 'bubble.indicators must be a non-empty array');
}

// ─── runner ──────────────────────────────────────────────────────────────────

const OFFLINE_EVALS = [
  run('black-scholes:put-call parity', 'offline', evalBlackScholesParity),
  run('covered-call:payoff',           'offline', evalCoveredCall),
  run('calendar:shape',                'offline', evalCalendar),
];

const NETWORK_EVALS = [
  run('stocks:shape',    'network', evalStocks),
  run('stocks:coverage', 'network', evalStocksTickers),
  run('news:shape',      'network', evalNews),
  run('bubble:score',    'network', evalBubble),
];

async function main() {
  const mode = process.argv[2]; // 'offline' | 'network' | undefined (all)
  const pending = mode === 'offline' ? OFFLINE_EVALS
                : mode === 'network' ? NETWORK_EVALS
                : [...OFFLINE_EVALS, ...NETWORK_EVALS];

  const results = (await Promise.allSettled(pending)).map(r =>
    r.status === 'fulfilled' ? r.value : { name: 'unknown', ok: false, error: String(r.reason), ms: 0, kind: 'offline' as EvalKind },
  );

  console.log(`\n━━━ Eval Results ${mode ? `(${mode})` : ''} ━━━\n`);
  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    if (r.ok) {
      console.log(`  ${icon}  [${r.kind}] ${r.name}  (${r.ms}ms)`);
      passed++;
    } else {
      console.error(`  ${icon}  [${r.kind}] ${r.name}  (${r.ms}ms)\n     ${r.error}`);
      failed++;
    }
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
