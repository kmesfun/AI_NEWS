'use client';

import { useEffect, useState } from 'react';
import type { CalendarEvent } from '@/lib/types';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(j => {
        setEvents(j.data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <ul className="calendar"><li style={{ padding: '20px', color: 'var(--text-muted)', gridColumn: '1/-1' }}>Loading…</li></ul>;
  }

  return (
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
  );
}
