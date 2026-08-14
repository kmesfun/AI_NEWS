'use client';

import { useEffect, useState } from 'react';
import type { BubbleData, BubbleIndicator, NewsItem } from '@/lib/types';

type TaggedItem = NewsItem & { matchedIndicators: string[] };

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function IndCard({ ind }: { ind: BubbleIndicator }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ind-card">
      <div className="ind-card-top" onClick={() => setOpen(o => !o)}>
        <span className={`ind-sev ${ind.severity}`} />
        <span className="ind-label">{ind.label}</span>
        <span className="ind-reading">{ind.reading}</span>
        <span className={`ind-sev-badge ${ind.severity}`}>{ind.severity.toUpperCase()}</span>
      </div>
      {open && (
        <div className="ind-card-body">
          <div className="ind-body-row">
            <span className="ind-body-label">THESIS</span>
            <span className="ind-body-text">{ind.thesis}</span>
          </div>
          <div className="ind-body-row">
            <span className="ind-body-label">DOT-COM PARALLEL</span>
            <span className="ind-body-text dot-com">{ind.dotcomParallel}</span>
          </div>
          <div className="ind-body-row">
            <span className="ind-body-label">IMPLICATION</span>
            <span className="ind-body-text implication">{ind.implication}</span>
          </div>
          {ind.watchSymbols?.length > 0 && (
            <div className="ind-body-row">
              <span className="ind-body-label">WATCH</span>
              <div className="ind-watch-syms">
                {ind.watchSymbols.map((sym, i) => (
                  <span key={i} className="ind-sym-tag">{sym}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BubbleWatch() {
  const [data, setData] = useState<BubbleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bubble')
      .then(r => r.json())
      .then(j => {
        setData(j.data ?? null);
        setLoading(false);
      });
  }, []);

  const indMap = new Map<string, BubbleIndicator>(
    data?.indicators.map(i => [i.id, i]) ?? []
  );

  return (
    <div className="section" data-cat="bubble" style={{ height: 'auto', minHeight: 'calc(100vh - 32px - 44px - 28px)' }}>
      <div className="section-header bubble-header">
        <div>
          <h2>AI BUBBLE WATCH</h2>
          <span className="section-sub">9 structural indicators · dot-com veteran framework</span>
        </div>
        {data && (
          <div className="composite-gauge" data-severity={data.composite.severity}>
            <span className="cg-score">{data.composite.score}/4.00</span>
            <span className="cg-label">{data.composite.label}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bubble-loading">Loading indicators…</div>
      ) : data ? (
        <div className="bubble-layout">
          {/* Bubble news column on left */}
          <div className="bubble-news-col">
            <div className="bubble-news-header">
              <span className="bnh-label">BUBBLE-TAGGED NEWS</span>
              <span className="bnh-sub">{data.news.length} stories match indicators</span>
            </div>
            <div className="bubble-feed feed" style={{ overflowY: 'auto' }}>
              <ul className="feed" style={{ margin: 0 }}>
                {data.news.length === 0 ? (
                  <li className="empty">No tagged news</li>
                ) : (
                  (data.news as TaggedItem[]).map((item, i) => {
                    const matchedInds = item.matchedIndicators
                      .map(id => indMap.get(id))
                      .filter((x): x is BubbleIndicator => !!x);
                    return (
                      <li key={i} onClick={() => window.open(item.link, '_blank', 'noreferrer')}>
                        <div className="row">
                          <span className="src">{item.source}</span>
                          <span className="time">{timeAgo(item.publishedAt)}</span>
                        </div>
                        <div className="title">{item.title}</div>
                        <div className="ind-tags">
                          {matchedInds.slice(0, 4).map((ind, j) => (
                            <span key={j} className={`ind-tag ${ind.severity}`}>
                              {ind.label.slice(0, 28)}
                            </span>
                          ))}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>

          {/* Indicators on right */}
          <div className="bubble-indicators">
            {data.indicators.map(ind => (
              <IndCard key={ind.id} ind={ind} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bubble-loading">Failed to load bubble data</div>
      )}

      {data?.analystNote && (
        <p className="analyst-note">{data.analystNote}</p>
      )}
    </div>
  );
}
