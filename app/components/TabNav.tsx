'use client';

import { useEffect, useRef, useState } from 'react';

const PRIMARY_TABS = [
  { id: 'top',           label: 'HEADLINES',    emoji: '📡' },
  { id: 'agentic',       label: 'AGENTIC AI',   emoji: '🤖' },
  { id: 'startups',      label: 'STARTUPS',     emoji: '🚀' },
  { id: 'semiconductors',label: 'SEMIS',        emoji: '⚡' },
  { id: 'ipo',           label: 'IPO',          emoji: '💰' },
  { id: 'calendar',      label: 'CALENDAR',     emoji: '📅' },
  { id: 'earnings',      label: 'EARNINGS',     emoji: '📊' },
  { id: 'bubble',        label: 'BUBBLE WATCH', emoji: '🫧', cls: 'tab-bubble' },
];

interface Props {
  activeTab: string;
  counts: Record<string, number>;
  onTabChange: (tab: string) => void;
  status: string;
  statusClass: string;
}

export default function TabNav({ activeTab, counts, onTabChange, status, statusClass }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const visibleTabs = PRIMARY_TABS.slice(0, 6);
  const moreTabs = PRIMARY_TABS.slice(6);
  const activeMore = moreTabs.find(t => t.id === activeTab);

  function handleTab(id: string) {
    onTabChange(id);
    setMoreOpen(false);
    window.location.hash = id;
  }

  return (
    <nav className="topbar">
      <div className="brand">
        <span className="brand-mark">AI</span>
        <span className="brand-name">NEWS TERMINAL</span>
      </div>

      <div className="tabs">
        <div className="primary-tabs">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              className={`tab tab-primary${t.cls ? ' ' + t.cls : ''}`}
              data-tab={t.id}
              aria-selected={activeTab === t.id ? 'true' : 'false'}
              onClick={() => handleTab(t.id)}
            >
              {t.label}
              {counts[t.id] != null && (
                <span className="tab-count">{counts[t.id]}</span>
              )}
            </button>
          ))}
        </div>

        <div className={`more-tabs${moreOpen ? ' open' : ''}`} ref={moreRef}>
          <button className="more-toggle" onClick={() => setMoreOpen(o => !o)}>
            MORE
            {activeMore && <span className="more-current">{activeMore.label}</span>}
          </button>
          <div className="more-menu">
            {moreTabs.map(t => (
              <button
                key={t.id}
                className={`tab more-tab${t.cls ? ' ' + t.cls : ''}`}
                data-tab={t.id}
                aria-selected={activeTab === t.id ? 'true' : 'false'}
                onClick={() => handleTab(t.id)}
              >
                <span>{t.emoji} {t.label}</span>
                {counts[t.id] != null && (
                  <span className="tab-count">{counts[t.id]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="meta">
        <span className="dot">●</span>
        <span className={statusClass}>{status}</span>
      </div>
    </nav>
  );
}
