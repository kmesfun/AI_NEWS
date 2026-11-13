'use client';

import { useEffect, useState } from 'react';
import type { CalendarEvent, IpoPipelineItem } from '@/lib/types';

const STATUS_LABEL: Record<IpoPipelineItem['status'], string> = {
  roadshow: 'ROADSHOW',
  filed: 'FILED CONFIDENTIALLY',
  'not-filed': 'NO FILING YET',
};

function countdown(iso: string): { text: string; imminent: boolean } {
  const now = new Date();
  const ev = new Date(iso);
  const diffMs = ev.getTime() - now.getTime();
  if (diffMs < 0) return { text: 'TODAY', imminent: true };
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return { text: 'TODAY', imminent: true };
  if (days === 1) return { text: 'TOMORROW', imminent: true };
  if (days < 7) return { text: `IN ${days}D`, imminent: true };
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return { text: `IN ${weeks}W`, imminent: false };
  return { text: `IN ${days}D`, imminent: false };
}

export default function CalendarFeed() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pipeline, setPipeline] = useState<IpoPipelineItem[]>([]);
  const [asOf, setAsOf] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(j => {
        setEvents(j.data ?? []);
        setPipeline(j.ipoPipeline ?? []);
        setAsOf(j.ipoPipelineAsOf ?? '');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <ul className="calendar"><li style={{ padding: '20px', color: 'var(--text-muted)', gridColumn: '1/-1' }}>Loading…</li></ul>;
  }

  return (
    <div className="calendar-wrap">
    <ul className="calendar">
      {events.length === 0 ? (
        <li style={{ padding: '20px', color: 'var(--text-muted)', gridColumn: '1/-1' }}>No upcoming events</li>
      ) : (
        events.map((ev, i) => {
          const d = new Date(ev.date);
          const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
          const day = d.toLocaleString('en-US', { day: 'numeric', timeZone: 'UTC' });
          const cd = countdown(ev.date);
          return (
            <li key={i} className={cd.imminent ? 'imminent' : ''}>
              <div className="when">
                <span className="mon">{mon}</span>
                <span className="day">{day}</span>
              </div>
              <div className="what">
                <span className="ev">{ev.event}</span>
                <span className={`kind ${ev.kind}`}>{ev.kind.toUpperCase()}</span>
                <span className="countdown">{cd.text}</span>
              </div>
              <div className="time">{ev.time ?? ''}</div>
            </li>
          );
        })
      )}
    </ul>

    {pipeline.length > 0 && (
      <div className="ipo-pipeline">
        <div className="ipo-pipeline-head">
          <h3>IPO PIPELINE</h3>
          <span>Tech and unicorn listings · press reports as of {asOf} · unconfirmed unless noted</span>
        </div>
        <ul className="ipo-grid">
          {pipeline.map(c => (
            <li key={c.name} className={`ipo-card ${c.status}`}>
              <div className="ipo-card-top">
                <span className="ipo-name">{c.name}</span>
                {c.ticker && <span className="ipo-ticker">{c.ticker}</span>}
              </div>
              <span className={`ipo-status ${c.status}`}>{STATUS_LABEL[c.status]}</span>
              <div className="ipo-window">{c.window}</div>
              <p className="ipo-note">{c.note}</p>
              {c.href && <a className="ipo-link" href={c.href} target="_blank" rel="noopener noreferrer">source ↗</a>}
            </li>
          ))}
        </ul>
      </div>
    )}
    </div>
  );
}
