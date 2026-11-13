'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { blackScholes, payoff, positionStats, type Strategy } from '@/lib/options';

const STRATEGIES: Array<{ id: Strategy; label: string; blurb: string }> = [
  { id: 'long-call', label: 'Long Call', blurb: 'Buy a call. Profit if the stock rallies past breakeven; risk is the premium paid.' },
  { id: 'long-put', label: 'Long Put', blurb: 'Buy a put. Profit if the stock falls past breakeven; risk is the premium paid.' },
  { id: 'covered-call', label: 'Covered Call', blurb: 'Own 100 shares and sell a call against them. Collect premium now; upside is capped at the strike.' },
];

const DTE_CHIPS = [7, 14, 30, 45, 60, 90, 180, 365];

const FALLBACK: Record<string, number> = { NVDA: 135, AAPL: 227, MSFT: 445, TSLA: 345, AMD: 155, META: 590 };
const SYMBOLS = Object.keys(FALLBACK);

function strikeStep(p: number) {
  return p < 25 ? 1 : p < 100 ? 2.5 : p < 250 ? 5 : 10;
}
function roundStrike(p: number) {
  const s = strikeStep(p);
  return Math.round(p / s) * s;
}

const usd = (n: number, d = 2) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const signedUsd = (n: number, d = 2) => `${n >= 0 ? '+' : '-'}${usd(Math.abs(n), d).replace('-', '')}`;
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

function Stepper({ label, value, onChange, step, min, prefix }: {
  label: string; value: number; onChange: (v: number) => void; step: number; min: number; prefix?: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.round(v * 100) / 100);
  return (
    <div className="rh-field">
      <span className="rh-field-label">{label}</span>
      <div className="rh-stepper">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))}>−</button>
        <label className="rh-stepper-input">
          {prefix && <span>{prefix}</span>}
          <input
            type="number" inputMode="decimal" min={min} step={step} value={value}
            onChange={e => onChange(clamp(parseFloat(e.target.value) || min))}
          />
        </label>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))}>+</button>
      </div>
    </div>
  );
}

function Slider({ label, value, display, min, max, step, onChange }: {
  label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="rh-field">
      <div className="rh-field-head">
        <span className="rh-field-label">{label}</span>
        <span className="rh-field-value">{display}</span>
      </div>
      <input
        className="rh-slider" type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function PayoffChart({ strategy, S, K, premium, mult, hoverPrice, onHover }: {
  strategy: Strategy; S: number; K: number; premium: number; mult: number;
  hoverPrice: number | null; onHover: (p: number | null) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const W = 640, H = 260, PAD = { l: 8, r: 8, t: 16, b: 26 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;

  const lo = Math.max(0.5, Math.min(S, K) * 0.75);
  const hi = Math.max(S, K) * 1.25;
  const N = 120;

  const pts = useMemo(() => Array.from({ length: N + 1 }, (_, i) => {
    const price = lo + ((hi - lo) * i) / N;
    return { price, pnl: payoff(strategy, S, K, premium, price) * mult };
  }), [strategy, S, K, premium, mult, lo, hi]);

  const minP = Math.min(0, ...pts.map(p => p.pnl));
  const maxP = Math.max(0, ...pts.map(p => p.pnl));
  const span = maxP - minP || 1;

  const toX = (price: number) => PAD.l + ((price - lo) / (hi - lo)) * iW;
  const toY = (pnl: number) => PAD.t + ((maxP - pnl) / span) * iH;
  const zeroY = toY(0);

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${toX(p.price).toFixed(1)},${toY(p.pnl).toFixed(1)}`).join(' ');
  const area = `${line} L${toX(hi).toFixed(1)},${zeroY.toFixed(1)} L${toX(lo).toFixed(1)},${zeroY.toFixed(1)} Z`;

  const hoverPnl = hoverPrice !== null ? payoff(strategy, S, K, premium, hoverPrice) * mult : 0;

  function handle(e: React.PointerEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const t = Math.min(1, Math.max(0, (x - PAD.l) / iW));
    onHover(lo + (hi - lo) * t);
  }

  const marks: Array<{ x: number; text: string; color: string }> = [
    { x: S, text: 'NOW', color: 'var(--rh-text-dim)' },
    { x: K, text: `K ${K}`, color: 'var(--rh-text)' },
  ];

  return (
    <svg
      ref={ref} className="rh-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Profit and loss at expiration"
      onPointerMove={handle} onPointerDown={handle} onPointerLeave={() => onHover(null)}
    >
      <defs>
        <clipPath id="rh-clip-up"><rect x="0" y="0" width={W} height={zeroY} /></clipPath>
        <clipPath id="rh-clip-down"><rect x="0" y={zeroY} width={W} height={H - zeroY} /></clipPath>
      </defs>

      <path d={area} fill="var(--rh-green)" opacity="0.14" clipPath="url(#rh-clip-up)" />
      <path d={area} fill="var(--rh-red)" opacity="0.14" clipPath="url(#rh-clip-down)" />

      <line x1={PAD.l} x2={W - PAD.r} y1={zeroY} y2={zeroY} className="rh-zero" />

      {marks.map(m => (
        <g key={m.text}>
          <line x1={toX(m.x)} x2={toX(m.x)} y1={PAD.t} y2={H - PAD.b} className="rh-mark" />
          <text x={toX(m.x)} y={H - 8} textAnchor="middle" fill={m.color} className="rh-axis">{m.text}</text>
        </g>
      ))}

      <path d={line} fill="none" stroke="var(--rh-green)" strokeWidth="2.5" strokeLinejoin="round" clipPath="url(#rh-clip-up)" />
      <path d={line} fill="none" stroke="var(--rh-red)" strokeWidth="2.5" strokeLinejoin="round" clipPath="url(#rh-clip-down)" />

      {hoverPrice !== null && (
        <g>
          <line x1={toX(hoverPrice)} x2={toX(hoverPrice)} y1={PAD.t} y2={H - PAD.b} className="rh-scrub" />
          <circle
            cx={toX(hoverPrice)} cy={toY(hoverPnl)} r="5.5"
            fill={hoverPnl >= 0 ? 'var(--rh-green)' : 'var(--rh-red)'} stroke="var(--rh-bg)" strokeWidth="2"
          />
        </g>
      )}
    </svg>
  );
}

function Row({ title, sub, value, tone }: { title: string; sub: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rh-row">
      <div>
        <div className="rh-row-title">{title}</div>
        <div className="rh-row-sub">{sub}</div>
      </div>
      <div className={`rh-row-value${tone ? ` rh-${tone}` : ''}`}>{value}</div>
    </div>
  );
}

export default function OptionsCalculator() {
  const [strategy, setStrategy] = useState<Strategy>('covered-call');
  const [symbol, setSymbol] = useState('NVDA');
  const [prices, setPrices] = useState<Record<string, number>>(FALLBACK);
  const [S, setS] = useState(FALLBACK.NVDA);
  const [K, setK] = useState(roundStrike(FALLBACK.NVDA * 1.05));
  const [dte, setDte] = useState(30);
  const [ivPct, setIvPct] = useState(45);
  const [ratePct, setRatePct] = useState(4.5);
  const [qty, setQty] = useState(1);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stocks')
      .then(r => r.json())
      .then(json => {
        if (cancelled || !Array.isArray(json.data)) return;
        const live: Record<string, number> = {};
        for (const q of json.data as Array<{ symbol: string; price: number }>) {
          if (SYMBOLS.includes(q.symbol) && q.price > 0) live[q.symbol] = q.price;
        }
        if (Object.keys(live).length) setPrices(p => ({ ...p, ...live }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const T = dte / 365, r = ratePct / 100, sigma = ivPct / 100;
  const bs = blackScholes(S, K, T, r, sigma);
  const mult = 100 * qty;
  const isCovered = strategy === 'covered-call';
  const isCall = strategy !== 'long-put';

  const premium = bs ? (isCall ? bs.callPrice : bs.putPrice) : 0;
  const stats = bs ? positionStats(strategy, S, K, premium, T, r, sigma) : null;
  const meta = STRATEGIES.find(s => s.id === strategy)!;

  function pick(sym: string) {
    const p = Math.round(prices[sym] * 100) / 100;
    setSymbol(sym);
    setS(p);
    setK(roundStrike(isCovered ? p * 1.05 : p));
    setHover(null);
  }

  function pickStrategy(next: Strategy) {
    setStrategy(next);
    if (next === 'covered-call' && K <= S) setK(roundStrike(S * 1.05));
    setHover(null);
  }

  const shown = hover ?? S;
  const shownPnl = payoff(strategy, S, K, premium, shown) * mult;
  const basis = isCovered ? (S - premium) * mult : premium * mult;
  const shownRet = basis > 0 ? shownPnl / basis : 0;

  const greeks = bs && (() => {
    const sgn = isCovered ? -1 : 1;
    const delta = strategy === 'long-put' ? bs.putDelta : isCovered ? 1 - bs.callDelta : bs.callDelta;
    const theta = (strategy === 'long-put' ? bs.putTheta : bs.callTheta) * sgn;
    const vega = bs.vega * sgn;
    const rho = (strategy === 'long-put' ? bs.putRho : bs.callRho) * sgn;
    const gamma = bs.gamma * sgn;
    return { delta, gamma, theta, vega, rho };
  })();

  const scenarios = [-20, -10, -5, 0, 5, 10, 20];

  return (
    <div className="rh">
      <div className="rh-chips" role="tablist" aria-label="Underlying">
        {SYMBOLS.map(sym => (
          <button
            key={sym} type="button" role="tab" aria-selected={symbol === sym}
            className={`rh-chip${symbol === sym ? ' on' : ''}`} onClick={() => pick(sym)}
          >{sym}</button>
        ))}
      </div>

      <div className="rh-layout">
        <section className="rh-main">
          <div className="rh-hero">
            <div className="rh-hero-kicker">{symbol} · {meta.label} · ${K} · {dte}d</div>
            <div className="rh-hero-price">{bs ? usd(premium * mult) : '—'}</div>
            <div className="rh-hero-sub">
              {isCovered ? 'premium collected' : 'premium paid'} · {usd(premium)}/share × {mult} shares
            </div>
            <div className={`rh-hero-pnl ${shownPnl >= 0 ? 'rh-up' : 'rh-down'}`}>
              {signedUsd(shownPnl)} ({shownRet >= 0 ? '+' : ''}{(shownRet * 100).toFixed(1)}%)
              <span className="rh-hero-at">
                {hover === null ? ' if unchanged' : ` at ${usd(shown)}`}
              </span>
            </div>
          </div>

          <PayoffChart
            strategy={strategy} S={S} K={K} premium={premium} mult={mult}
            hoverPrice={hover} onHover={setHover}
          />
          <div className="rh-chart-hint">Drag across the chart to see profit or loss at expiration</div>

          <div className="rh-seg" role="tablist" aria-label="Strategy">
            {STRATEGIES.map(s => (
              <button
                key={s.id} type="button" role="tab" aria-selected={strategy === s.id}
                className={strategy === s.id ? 'on' : ''} onClick={() => pickStrategy(s.id)}
              >{s.label}</button>
            ))}
          </div>
          <p className="rh-blurb">{meta.blurb}</p>

          {stats && bs && greeks ? (
            <>
              <div className="rh-card">
                <h3>Position summary</h3>
                <Row
                  title="Max profit"
                  sub={isCovered ? 'Shares called away at the strike' : strategy === 'long-call' ? 'Unlimited upside' : 'Stock goes to $0'}
                  value={Number.isFinite(stats.maxProfit) ? signedUsd(stats.maxProfit * mult) : 'Unlimited'} tone="up"
                />
                <Row
                  title="Max loss"
                  sub={isCovered ? 'Stock goes to $0, less premium kept' : 'Option expires worthless'}
                  value={`-${usd(stats.maxLoss * mult)}`} tone="down"
                />
                <Row title="Breakeven" sub="Stock price at expiration" value={usd(stats.breakeven)} />
                <Row title="Chance of profit" sub="Risk-neutral estimate from IV" value={pct(stats.chanceOfProfit)} />
                {isCovered && stats.chanceAssigned !== undefined && (
                  <>
                    <Row title="Chance of assignment" sub={`Stock finishes above $${K}`} value={pct(stats.chanceAssigned)} />
                    <Row
                      title="Return if called away" sub={`${pct(stats.annualizedReturn ?? 0)} annualized`}
                      value={`${pct(stats.returnIfAssigned ?? 0, 2)}`} tone={(stats.returnIfAssigned ?? 0) >= 0 ? 'up' : 'down'}
                    />
                    <Row title="Downside cushion" sub="Premium as a share of stock price" value={pct(stats.downsideCushion ?? 0, 2)} />
                    <Row title="Capital required" sub={`${mult} shares, net of premium`} value={usd((S - premium) * mult)} />
                  </>
                )}
              </div>

              <div className="rh-card">
                <h3>Greeks <small>{isCovered ? 'whole position, per share' : 'per share'}</small></h3>
                <Row title="Delta" sub="Position change per $1 move in the stock" value={greeks.delta.toFixed(3)} />
                <Row title="Gamma" sub="How fast delta changes per $1" value={greeks.gamma.toFixed(4)} />
                <Row
                  title="Theta" sub="Time decay per day"
                  value={`${signedUsd(greeks.theta * mult)}/day`} tone={greeks.theta >= 0 ? 'up' : 'down'}
                />
                <Row title="Vega" sub="Change per 1% move in IV" value={`${signedUsd(greeks.vega * mult)}`} tone={greeks.vega >= 0 ? 'up' : 'down'} />
                <Row title="Rho" sub="Change per 1% move in rates" value={`${signedUsd(greeks.rho * mult)}`} />
              </div>

              <div className="rh-card">
                <h3>Scenarios at expiration</h3>
                <div className="rh-table-wrap">
                  <table className="rh-table">
                    <thead>
                      <tr><th>Stock</th><th>Move</th><th>P&amp;L</th><th>Return</th></tr>
                    </thead>
                    <tbody>
                      {scenarios.map(m => {
                        const price = S * (1 + m / 100);
                        const pnl = payoff(strategy, S, K, premium, price) * mult;
                        const ret = basis > 0 ? pnl / basis : 0;
                        return (
                          <tr key={m} className={m === 0 ? 'now' : ''}>
                            <td>{usd(price)}</td>
                            <td className={m > 0 ? 'rh-up' : m < 0 ? 'rh-down' : ''}>{m > 0 ? '+' : ''}{m}%</td>
                            <td className={pnl >= 0 ? 'rh-up' : 'rh-down'}>{signedUsd(pnl)}</td>
                            <td className={ret >= 0 ? 'rh-up' : 'rh-down'}>{ret >= 0 ? '+' : ''}{(ret * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rh-empty">Enter valid inputs to calculate</div>
          )}
        </section>

        <aside className="rh-side">
          <div className="rh-card">
            <h3>Build your trade</h3>
            <Stepper label="Stock price" value={S} onChange={setS} step={strikeStep(S) / 2} min={1} prefix="$" />
            <Stepper label="Strike price" value={K} onChange={setK} step={strikeStep(S)} min={1} prefix="$" />
            <div className="rh-moneyness">
              {K === S ? 'At the money' : (isCall ? S > K : S < K) ? 'In the money' : 'Out of the money'}
              {' · '}{(((K - S) / S) * 100).toFixed(1)}% from current price
            </div>
            <Stepper label={isCovered ? 'Contracts (100 shares each)' : 'Contracts'} value={qty} onChange={v => setQty(Math.round(v))} step={1} min={1} />

            <div className="rh-field">
              <span className="rh-field-label">Expiration</span>
              <div className="rh-dte">
                {DTE_CHIPS.map(d => (
                  <button key={d} type="button" className={dte === d ? 'on' : ''} onClick={() => setDte(d)}>
                    {d >= 365 ? '1y' : `${d}d`}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Days to expiration" value={dte} display={`${dte}d`} min={1} max={365} step={1} onChange={setDte} />
            <Slider label="Implied volatility" value={ivPct} display={`${ivPct}%`} min={5} max={200} step={1} onChange={setIvPct} />
            <Slider label="Risk-free rate" value={ratePct} display={`${ratePct.toFixed(2)}%`} min={0} max={10} step={0.25} onChange={setRatePct} />
          </div>
        </aside>
      </div>

      <p className="rh-disclaimer">
        Black-Scholes assumes constant volatility, no dividends and European exercise; listed equity options are American.
        Covered-call figures ignore commissions and early assignment. Educational use only, not financial advice.
      </p>
    </div>
  );
}
