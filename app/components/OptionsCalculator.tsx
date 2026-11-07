'use client';

import { useState, useCallback } from 'react';

// ── Black-Scholes math ──────────────────────────────────────────────────

function erf(x: number): number {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
  return sign * y;
}

function normCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

interface BSResult {
  callPrice: number;
  putPrice: number;
  d1: number;
  d2: number;
  callDelta: number;
  putDelta: number;
  gamma: number;
  callTheta: number;
  putTheta: number;
  vega: number;
  callRho: number;
  putRho: number;
  intrinsicCall: number;
  intrinsicPut: number;
  timeValueCall: number;
  timeValuePut: number;
}

function blackScholes(S: number, K: number, T: number, r: number, sigma: number): BSResult | null {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normCDF(d1), Nd2 = normCDF(d2);
  const Nnd1 = normCDF(-d1), Nnd2 = normCDF(-d2);
  const nd1 = normPDF(d1);
  const disc = Math.exp(-r * T);

  const callPrice = S * Nd1 - K * disc * Nd2;
  const putPrice  = K * disc * Nnd2 - S * Nnd1;

  return {
    callPrice, putPrice, d1, d2,
    callDelta: Nd1,
    putDelta:  Nd1 - 1,
    gamma:     nd1 / (S * sigma * sqrtT),
    callTheta: (-S * nd1 * sigma / (2 * sqrtT) - r * K * disc * Nd2)  / 365,
    putTheta:  (-S * nd1 * sigma / (2 * sqrtT) + r * K * disc * Nnd2) / 365,
    vega:      S * nd1 * sqrtT / 100,
    callRho:   K * T * disc * Nd2  / 100,
    putRho:    -K * T * disc * Nnd2 / 100,
    intrinsicCall: Math.max(0, S - K),
    intrinsicPut:  Math.max(0, K - S),
    timeValueCall: Math.max(0, callPrice - Math.max(0, S - K)),
    timeValuePut:  Math.max(0, putPrice  - Math.max(0, K - S)),
  };
}

// ── P&L chart ─────────────────────────────────────────────────────────

function PnLChart({ S, K, premium, type, sigma: _sigma, T: _T }: {
  S: number; K: number; premium: number; type: 'call' | 'put'; sigma: number; T: number;
}) {
  const range = Math.max(S * 0.3, 30);
  const lo = Math.max(1, S - range), hi = S + range;
  const steps = 60;
  const pts: { x: number; pnl: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const price = lo + (hi - lo) * i / steps;
    const pnl = type === 'call'
      ? Math.max(0, price - K) - premium
      : Math.max(0, K - price) - premium;
    pts.push({ x: price, pnl });
  }

  const pnls = pts.map(p => p.pnl);
  const minPnl = Math.min(...pnls);
  const maxPnl = Math.max(...pnls);
  const pRange = maxPnl - minPnl || 1;

  const W = 480, H = 160, PAD = { l: 48, r: 16, t: 12, b: 28 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;

  const toX = (price: number) => PAD.l + ((price - lo) / (hi - lo)) * iW;
  const toY = (pnl: number) => PAD.t + ((maxPnl - pnl) / pRange) * iH;

  const zeroY = toY(0);
  const breakeven = type === 'call' ? K + premium : K - premium;
  const beX = toX(breakeven);
  const curX = toX(S);

  // Build the filled area path
  const above: string[] = [], below: string[] = [];
  let prevAbove = pnls[0] >= 0;
  let pathAbove = '', pathBelow = '';

  pts.forEach((p, i) => {
    const x = toX(p.x), y = toY(p.pnl);
    if (i === 0) {
      pathAbove = `M${x},${zeroY} L${x},${y}`;
      pathBelow = `M${x},${zeroY} L${x},${y}`;
    } else {
      if (p.pnl >= 0 !== prevAbove) {
        // crossing zero — find intersection
        const pp = pts[i - 1];
        const ix = toX(pp.x + (p.x - pp.x) * Math.abs(pp.pnl) / (Math.abs(pp.pnl) + Math.abs(p.pnl)));
        pathAbove += ` L${ix},${zeroY}`;
        pathBelow += ` L${ix},${zeroY}`;
      }
      pathAbove += ` L${x},${p.pnl >= 0 ? y : zeroY}`;
      pathBelow += ` L${x},${p.pnl < 0 ? y : zeroY}`;
      prevAbove = p.pnl >= 0;
    }
    if (p.pnl >= 0) above.push(`${x},${y}`); else below.push(`${x},${y}`);
  });
  void above; void below;
  const lastX = toX(pts[pts.length - 1].x);
  pathAbove += ` L${lastX},${zeroY} Z`;
  pathBelow += ` L${lastX},${zeroY} Z`;

  // Line path
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.pnl)}`).join(' ');

  // Y-axis labels
  const yTicks = [minPnl, 0, maxPnl].filter((v, i, a) => a.indexOf(v) === i && Math.abs(v) > 0.01);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      {/* Grid */}
      <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY} stroke="var(--border-strong)" strokeWidth="1" />

      {/* Filled areas */}
      <path d={pathAbove} fill="rgba(46,204,113,0.15)" />
      <path d={pathBelow} fill="rgba(255,77,77,0.15)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

      {/* Breakeven */}
      {beX >= PAD.l && beX <= W - PAD.r && (
        <>
          <line x1={beX} y1={PAD.t} x2={beX} y2={H - PAD.b} stroke="var(--yellow)" strokeWidth="1" strokeDasharray="3,3" />
          <text x={beX + 3} y={PAD.t + 10} fill="var(--yellow)" fontSize="9" fontFamily="monospace">BE {breakeven.toFixed(0)}</text>
        </>
      )}

      {/* Current price */}
      <line x1={curX} y1={PAD.t} x2={curX} y2={H - PAD.b} stroke="var(--blue)" strokeWidth="1" strokeDasharray="4,2" />
      <text x={curX + 3} y={H - PAD.b - 2} fill="var(--blue)" fontSize="9" fontFamily="monospace">NOW</text>

      {/* Y-axis ticks */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <text x={PAD.l - 4} y={toY(v) + 4} fill="var(--text-muted)" fontSize="9" fontFamily="monospace" textAnchor="end">
            {v >= 0 ? '+' : ''}{v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* X-axis ticks */}
      {[lo, K, S, hi].map((v, i) => (
        <g key={i}>
          <line x1={toX(v)} y1={H - PAD.b} x2={toX(v)} y2={H - PAD.b + 3} stroke="var(--border-strong)" strokeWidth="1" />
          <text x={toX(v)} y={H - 2} fill={v === K ? 'var(--accent)' : 'var(--text-muted)'} fontSize="9" fontFamily="monospace" textAnchor="middle">
            {v === K ? `K=${v.toFixed(0)}` : v.toFixed(0)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Greek display helpers ─────────────────────────────────────────────

function GreekCard({ label, value, unit = '', description }: {
  label: string; value: number; unit?: string; description: string;
}) {
  const [hover, setHover] = useState(false);
  const formatted = Math.abs(value) < 0.0001 ? value.toExponential(2) :
    Math.abs(value) < 0.01 ? value.toFixed(4) : value.toFixed(4);
  return (
    <div
      className="greek-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="greek-label">{label}</span>
      <span className="greek-value">{formatted}{unit}</span>
      {hover && <div className="greek-tooltip">{description}</div>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

const POPULAR: Array<{ sym: string; price: number; label: string }> = [
  { sym: 'NVDA',  price: 135, label: 'NVDA'  },
  { sym: 'AAPL',  price: 227, label: 'AAPL'  },
  { sym: 'MSFT',  price: 445, label: 'MSFT'  },
  { sym: 'TSLA',  price: 345, label: 'TSLA'  },
  { sym: 'AMD',   price: 155, label: 'AMD'   },
  { sym: 'SPY',   price: 585, label: 'SPY'   },
];

export default function OptionsCalculator() {
  const [stockPrice, setStockPrice]   = useState(135);
  const [strikePrice, setStrikePrice] = useState(135);
  const [daysToExp, setDaysToExp]     = useState(30);
  const [volPct, setVolPct]           = useState(60);
  const [ratePct, setRatePct]         = useState(5.25);
  const [optType, setOptType]         = useState<'call' | 'put'>('call');

  const T = daysToExp / 365;
  const r = ratePct / 100;
  const sigma = volPct / 100;

  const bs = blackScholes(stockPrice, strikePrice, T, r, sigma);

  const moneyness = stockPrice > strikePrice ? 'ITM' : stockPrice < strikePrice ? 'OTM' : 'ATM';
  const moneynessColor = moneyness === 'ITM' ? 'var(--green)' : moneyness === 'OTM' ? 'var(--red)' : 'var(--yellow)';

  const handleQuickFill = useCallback((p: number) => {
    setStockPrice(p);
    setStrikePrice(Math.round(p / 5) * 5);
  }, []);

  const price = bs ? (optType === 'call' ? bs.callPrice : bs.putPrice) : 0;

  return (
    <div className="options-calc">
      {/* Quick-fill popular underlyings */}
      <div className="options-presets">
        <span className="options-presets-label">QUICK FILL</span>
        {POPULAR.map((p) => (
          <button key={p.sym} className="preset-btn" onClick={() => handleQuickFill(p.price)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="options-body">
        {/* ── Inputs ── */}
        <div className="options-inputs">
          <div className="input-group">
            <label>STOCK PRICE (S)</label>
            <div className="input-with-unit">
              <span className="input-prefix">$</span>
              <input
                type="number" min="1" step="0.5"
                value={stockPrice}
                onChange={e => setStockPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>STRIKE PRICE (K)</label>
            <div className="input-with-unit">
              <span className="input-prefix">$</span>
              <input
                type="number" min="1" step="0.5"
                value={strikePrice}
                onChange={e => setStrikePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <span className="moneyness-badge" style={{ color: moneynessColor, borderColor: moneynessColor }}>
              {moneyness}
            </span>
          </div>

          <div className="input-group">
            <label>DAYS TO EXPIRATION</label>
            <input
              type="range" min="1" max="365" step="1"
              value={daysToExp}
              onChange={e => setDaysToExp(parseInt(e.target.value))}
              className="range-input"
            />
            <span className="range-value">{daysToExp}d ({(daysToExp / 365).toFixed(2)}y)</span>
          </div>

          <div className="input-group">
            <label>IMPLIED VOLATILITY (IV)</label>
            <input
              type="range" min="5" max="300" step="1"
              value={volPct}
              onChange={e => setVolPct(parseInt(e.target.value))}
              className="range-input"
            />
            <span className="range-value">{volPct}%</span>
          </div>

          <div className="input-group">
            <label>RISK-FREE RATE</label>
            <input
              type="range" min="0" max="10" step="0.25"
              value={ratePct}
              onChange={e => setRatePct(parseFloat(e.target.value))}
              className="range-input"
            />
            <span className="range-value">{ratePct.toFixed(2)}%</span>
          </div>

          {/* Option type selector */}
          <div className="opt-type-row">
            <button
              className={`opt-type-btn${optType === 'call' ? ' active-call' : ''}`}
              onClick={() => setOptType('call')}
            >CALL</button>
            <button
              className={`opt-type-btn${optType === 'put' ? ' active-put' : ''}`}
              onClick={() => setOptType('put')}
            >PUT</button>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="options-results">
          {bs ? (
            <>
              {/* Price cards */}
              <div className="price-cards">
                <div className={`price-card${optType === 'call' ? ' price-card-active' : ''}`} onClick={() => setOptType('call')}>
                  <span className="price-card-type">CALL</span>
                  <span className="price-card-val">${bs.callPrice.toFixed(2)}</span>
                  <span className="price-card-sub">IV: {volPct}% · {daysToExp}d</span>
                  <div className="price-card-breakdown">
                    <span>Intrinsic: ${bs.intrinsicCall.toFixed(2)}</span>
                    <span>Time: ${bs.timeValueCall.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`price-card${optType === 'put' ? ' price-card-active-put' : ''}`} onClick={() => setOptType('put')}>
                  <span className="price-card-type">PUT</span>
                  <span className="price-card-val">${bs.putPrice.toFixed(2)}</span>
                  <span className="price-card-sub">IV: {volPct}% · {daysToExp}d</span>
                  <div className="price-card-breakdown">
                    <span>Intrinsic: ${bs.intrinsicPut.toFixed(2)}</span>
                    <span>Time: ${bs.timeValuePut.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Greeks */}
              <div className="greeks-section">
                <div className="greeks-title">THE GREEKS <span className="greeks-hover-hint">hover for explanation</span></div>
                <div className="greeks-grid">
                  <GreekCard
                    label="Δ DELTA"
                    value={optType === 'call' ? bs.callDelta : bs.putDelta}
                    description="Rate of change in option price per $1 move in the stock. Delta 0.5 ≈ option moves $0.50 per $1 stock move."
                  />
                  <GreekCard
                    label="Γ GAMMA"
                    value={bs.gamma}
                    description="Rate of change of delta per $1 move. High gamma = delta changes fast (risky near expiry)."
                  />
                  <GreekCard
                    label="Θ THETA"
                    value={optType === 'call' ? bs.callTheta : bs.putTheta}
                    unit="/day"
                    description="Daily time decay — how much the option loses each day with everything else constant. Usually negative (bad for buyers)."
                  />
                  <GreekCard
                    label="V VEGA"
                    value={bs.vega}
                    unit="/1%IV"
                    description="Price change per 1% move in implied volatility. High vega = very sensitive to IV changes."
                  />
                  <GreekCard
                    label="Ρ RHO"
                    value={optType === 'call' ? bs.callRho : bs.putRho}
                    unit="/1%rate"
                    description="Price change per 1% move in the risk-free rate. Usually small and rarely the dominant risk."
                  />
                  <div className="greek-card greek-card-info">
                    <span className="greek-label">BREAKEVEN</span>
                    <span className="greek-value">
                      ${optType === 'call' ? (strikePrice + price).toFixed(2) : (strikePrice - price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* P&L Diagram */}
              <div className="pnl-section">
                <div className="pnl-title">P&amp;L AT EXPIRATION · {optType.toUpperCase()} ${strikePrice} · paid ${price.toFixed(2)}</div>
                <div className="pnl-legend">
                  <span style={{ color: 'var(--blue)' }}>── Current price</span>
                  <span style={{ color: 'var(--yellow)' }}>┄ Breakeven</span>
                  <span style={{ color: 'var(--green)' }}>█ Profit zone</span>
                  <span style={{ color: 'var(--red)' }}>█ Loss zone</span>
                </div>
                <div className="pnl-chart-wrap">
                  <PnLChart S={stockPrice} K={strikePrice} premium={price} type={optType} sigma={sigma} T={T} />
                </div>
              </div>

              {/* Scenario table */}
              <div className="scenario-section">
                <div className="scenario-title">PRICE SCENARIOS AT EXPIRATION</div>
                <div className="scenario-table-wrap">
                  <table className="scenario-table">
                    <thead>
                      <tr>
                        <th>STOCK AT</th>
                        <th className="num">MOVE</th>
                        <th className="num">INTRINSIC</th>
                        <th className="num">P&amp;L</th>
                        <th className="num">RETURN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[-30, -20, -10, -5, 0, 5, 10, 20, 30].map((pct) => {
                        const sp = stockPrice * (1 + pct / 100);
                        const intrinsic = optType === 'call' ? Math.max(0, sp - strikePrice) : Math.max(0, strikePrice - sp);
                        const pnl = intrinsic - price;
                        const ret = price > 0 ? (pnl / price) * 100 : 0;
                        const isNow = pct === 0;
                        return (
                          <tr key={pct} style={isNow ? { background: 'rgba(76,194,255,0.07)' } : {}}>
                            <td style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>${sp.toFixed(0)}</td>
                            <td className="num" style={{ color: pct > 0 ? 'var(--green)' : pct < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                              {pct > 0 ? '+' : ''}{pct}%
                            </td>
                            <td className="num">${intrinsic.toFixed(2)}</td>
                            <td className="num" style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </td>
                            <td className="num" style={{ color: ret >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              {ret >= 0 ? '+' : ''}{ret.toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '30px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'monospace' }}>
              Enter valid inputs to calculate
            </div>
          )}
        </div>
      </div>

      <div className="options-disclaimer">
        ⚑ DISCLAIMER: Black-Scholes assumes constant volatility, no dividends, and European-style exercise. American options (most equity options) may price differently. This tool is for educational purposes only — not financial advice.
      </div>
    </div>
  );
}
