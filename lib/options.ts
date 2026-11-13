export type Strategy = 'long-call' | 'long-put' | 'covered-call';

export function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export const normCDF = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
export const normPDF = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

export interface BSResult {
  callPrice: number;
  putPrice: number;
  callDelta: number;
  putDelta: number;
  gamma: number;
  callTheta: number;
  putTheta: number;
  vega: number;
  callRho: number;
  putRho: number;
}

export function blackScholes(S: number, K: number, T: number, r: number, sigma: number): BSResult | null {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const disc = Math.exp(-r * T);
  const nd1 = normPDF(d1);
  return {
    callPrice: S * normCDF(d1) - K * disc * normCDF(d2),
    putPrice: K * disc * normCDF(-d2) - S * normCDF(-d1),
    callDelta: normCDF(d1),
    putDelta: normCDF(d1) - 1,
    gamma: nd1 / (S * sigma * sqrtT),
    callTheta: (-S * nd1 * sigma / (2 * sqrtT) - r * K * disc * normCDF(d2)) / 365,
    putTheta: (-S * nd1 * sigma / (2 * sqrtT) + r * K * disc * normCDF(-d2)) / 365,
    vega: S * nd1 * sqrtT / 100,
    callRho: K * T * disc * normCDF(d2) / 100,
    putRho: -K * T * disc * normCDF(-d2) / 100,
  };
}

/** Risk-neutral probability that the stock finishes above `x` at expiry. */
export function probAbove(S: number, x: number, T: number, r: number, sigma: number): number {
  if (x <= 0) return 1;
  return normCDF((Math.log(S / x) + (r - 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T)));
}

/** P&L per share at expiry. Covered call is measured from today's stock price. */
export function payoff(strategy: Strategy, S: number, K: number, premium: number, price: number): number {
  switch (strategy) {
    case 'long-call': return Math.max(0, price - K) - premium;
    case 'long-put': return Math.max(0, K - price) - premium;
    case 'covered-call': return (price - S) - Math.max(0, price - K) + premium;
  }
}

export interface PositionStats {
  /** Per share. Infinity when uncapped. */
  maxProfit: number;
  /** Per share, as a positive number. */
  maxLoss: number;
  breakeven: number;
  chanceOfProfit: number;
  /** Covered call only. */
  chanceAssigned?: number;
  returnIfAssigned?: number;
  annualizedReturn?: number;
  downsideCushion?: number;
}

export function positionStats(
  strategy: Strategy, S: number, K: number, premium: number, T: number, r: number, sigma: number,
): PositionStats {
  switch (strategy) {
    case 'long-call': {
      const breakeven = K + premium;
      return { maxProfit: Infinity, maxLoss: premium, breakeven, chanceOfProfit: probAbove(S, breakeven, T, r, sigma) };
    }
    case 'long-put': {
      const breakeven = K - premium;
      return { maxProfit: K - premium, maxLoss: premium, breakeven, chanceOfProfit: 1 - probAbove(S, breakeven, T, r, sigma) };
    }
    case 'covered-call': {
      const breakeven = S - premium;
      const maxProfit = K - S + premium;
      const basis = S - premium;
      const returnIfAssigned = basis > 0 ? maxProfit / basis : 0;
      return {
        maxProfit,
        maxLoss: breakeven,
        breakeven,
        chanceOfProfit: probAbove(S, breakeven, T, r, sigma),
        chanceAssigned: probAbove(S, K, T, r, sigma),
        returnIfAssigned,
        annualizedReturn: returnIfAssigned * (1 / T),
        downsideCushion: S > 0 ? premium / S : 0,
      };
    }
  }
}
