'use client';

import { useEffect, useState } from 'react';
import type { Quote } from '@/lib/types';

export default function TickerBar() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchQuotes() {
    try {
      const res = await fetch('/api/stocks');
      const json = await res.json();
      if (json.data?.length) {
        setQuotes(json.data);
        setLoading(false);
      }
    } catch {
      // keep showing last quotes on error
    }
  }

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ticker-bar">
      <div className="ticker-label">LIVE</div>
      <div className="ticker-viewport">
        {loading ? (
          <span className="ticker-loading">Loading quotes…</span>
        ) : (
          <div className="ticker-track">
            {[...quotes, ...quotes].map((q, i) => {
              const isUp = q.change > 0;
              const isDown = q.change < 0;
              const dir = isUp ? 'up' : isDown ? 'dn' : 'flat';
              const arrow = isUp ? '▲' : isDown ? '▼' : '—';
              const sign = isUp ? '+' : '';
              return (
                <span key={i} className="tick">
                  <span className="sym">{q.symbol}</span>
                  <span className="px">{q.price.toFixed(2)}</span>
                  <span className={`chg ${dir}`}>
                    <span className="arrow">{arrow}</span>{' '}
                    {sign}{q.change.toFixed(2)} ({sign}{q.changePercent.toFixed(2)}%)
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
