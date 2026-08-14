'use client';

import { useEffect, useState } from 'react';
import type { NewsItem, BubbleIndicator } from '@/lib/types';

type TaggedItem = NewsItem & { matchedIndicators: string[] };

const IND_SEVERITY: Record<string, 'red' | 'orange' | 'yellow' | 'green'> = {
  private_market_excess: 'red',
  taiwan_risk_unpriced: 'red',
  valuation_spread: 'orange',
  capex_monetization_gap: 'orange',
  picks_shovels_breadth: 'orange',
  hbm_memory_pricing: 'yellow',
  insider_disposition: 'orange',
  enterprise_roi: 'yellow',
  momentum_feedback_loop: 'yellow',
};

const SEV_RANK: Record<string, number> = { red: 3, orange: 2, yellow: 1, green: 0 };

function alertSeverity(matchedIds: string[]): 'red' | 'orange' | null {
  let best = -1;
  let sev: 'red' | 'orange' | null = null;
  for (const id of matchedIds) {
    const s = IND_SEVERITY[id];
    if (s && (s === 'red' || s === 'orange') && SEV_RANK[s] > best) {
      best = SEV_RANK[s];
      sev = s;
    }
  }
  return sev;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  category: 'top' | 'agentic' | 'startups' | 'semiconductors' | 'ipo';
  onCountChange?: (cat: string, count: number) => void;
}

export default function NewsFeed({ category, onCountChange }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [alerts, setAlerts] = useState<(TaggedItem & { alertSev: 'red' | 'orange' })[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  async function fetchAll() {
    const [newsRes, bubbleRes] = await Promise.all([
      fetch('/api/news'),
      category === 'top' ? fetch('/api/bubble') : Promise.resolve(null),
    ]);

    const newsJson = await newsRes.json();
    const allItems: Record<string, NewsItem[]> = newsJson.data ?? {};
    const list = allItems[category] ?? [];
    setItems(list);
    setUpdatedAt(newsJson.updatedAt ?? '');
    onCountChange?.(category, list.length);

    if (bubbleRes) {
      const bJson = await bubbleRes.json();
      const tagged: TaggedItem[] = bJson.data?.news ?? [];
      const alerted = tagged
        .map(n => {
          const sev = alertSeverity(n.matchedIndicators);
          return sev ? { ...n, alertSev: sev } : null;
        })
        .filter((x): x is TaggedItem & { alertSev: 'red' | 'orange' } => x !== null)
        .slice(0, 5);
      setAlerts(alerted);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 600_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (loading) {
    return <ul className="feed"><li className="empty">Loading…</li></ul>;
  }

  return (
    <>
      {category === 'top' && alerts.length > 0 && alerts.map((a, i) => (
        <a key={i} href={a.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
          <ul className="feed" style={{ margin: 0, padding: 0 }}>
            <li className={`bubble-alert-item sev-${a.alertSev}`}>
              <div className="alert-banner">
                <span className="alert-icon">⚠</span>
                <span className="alert-label">BUBBLE ALERT</span>
                <span className="alert-ind-tags">
                  {a.matchedIndicators.map((id, j) => (
                    <span key={j} className={`alert-ind-tag sev-${IND_SEVERITY[id] ?? 'yellow'}`}>
                      {id.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="alert-time">{timeAgo(a.publishedAt)}</span>
              </div>
              <div className="title">{a.title}</div>
              <div className="row">
                <span className="src">{a.source}</span>
              </div>
            </li>
          </ul>
        </a>
      ))}

      {category === 'top' && alerts.length > 0 && (
        <ul className="feed" style={{ margin: 0, padding: 0 }}>
          <li className="feed-divider" style={{ padding: '6px 22px' }}>
            <span>LATEST HEADLINES</span>
          </li>
        </ul>
      )}

      <ul className="feed">
        {items.length === 0 ? (
          <li className="empty">No stories found</li>
        ) : (
          items.map((item, i) => (
            <li key={i} onClick={() => window.open(item.link, '_blank', 'noreferrer')}>
              <div className="row">
                <span className="src">{item.source}</span>
                <span className="time">{timeAgo(item.publishedAt)}</span>
              </div>
              <div className="title">{item.title}</div>
              {item.snippet && <div className="snippet">{item.snippet}</div>}
            </li>
          ))
        )}
      </ul>

      {updatedAt && (
        <div className="statusbar">
          <span>{items.length} stories</span>
          <span>Updated {timeAgo(updatedAt)}</span>
        </div>
      )}
    </>
  );
}
