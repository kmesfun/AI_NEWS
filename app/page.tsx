'use client';

import { useEffect, useState } from 'react';
import TabNav from './components/TabNav';
import NewsFeed from './components/NewsFeed';
import CalendarFeed from './components/CalendarFeed';
import EarningsTable from './components/EarningsTable';
import BubbleWatch from './components/BubbleWatch';

const NEWS_CATS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo'] as const;

function getInitialTab(): string {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '');
    if (['top', 'agentic', 'startups', 'semiconductors', 'ipo', 'calendar', 'earnings', 'bubble'].includes(hash)) {
      return hash;
    }
  }
  return 'top';
}

export default function Page() {
  const [tab, setTab] = useState('top');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('LIVE');
  const [statusClass, setStatusClass] = useState('status-ok');

  useEffect(() => {
    setTab(getInitialTab());
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h) setTab(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    setStatus('LOADING');
    setStatusClass('status-loading');
    const t = setTimeout(() => {
      setStatus('LIVE');
      setStatusClass('status-ok');
    }, 2000);
    return () => clearTimeout(t);
  }, [tab]);

  function handleCount(cat: string, count: number) {
    setCounts(prev => ({ ...prev, [cat]: count }));
  }

  const sectionStyle = (active: boolean): React.CSSProperties =>
    active ? {} : { display: 'none' };

  return (
    <>
      <TabNav
        activeTab={tab}
        counts={counts}
        onTabChange={setTab}
        status={status}
        statusClass={statusClass}
      />

      <main className="layout">
        {NEWS_CATS.map(cat => (
          <div key={cat} className="section" data-cat={cat} style={sectionStyle(tab === cat)}>
            <div className="section-header">
              <h2>
                {cat === 'top' ? 'HEADLINES' :
                 cat === 'agentic' ? 'AGENTIC AI' :
                 cat === 'startups' ? 'AI STARTUPS' :
                 cat === 'semiconductors' ? 'SEMICONDUCTORS' : 'IPO WATCH'}
              </h2>
              <span className="section-sub">
                {cat === 'top' ? 'Top stories across all categories' :
                 cat === 'agentic' ? 'Agents, LLMs, autonomous systems' :
                 cat === 'startups' ? 'Funding rounds, launches, M&A' :
                 cat === 'semiconductors' ? 'Chips, GPUs, fabs, TSMC' : 'IPOs, S-1 filings, direct listings'}
              </span>
            </div>
            <NewsFeed category={cat} onCountChange={handleCount} />
          </div>
        ))}

        <div className="section" data-cat="calendar" style={sectionStyle(tab === 'calendar')}>
          <div className="section-header">
            <h2>ECONOMIC CALENDAR</h2>
            <span className="section-sub">FOMC, macro releases, key AI earnings</span>
          </div>
          <CalendarFeed />
        </div>

        <div className="section" data-cat="earnings" style={sectionStyle(tab === 'earnings')}>
          <div className="section-header">
            <h2>EARNINGS CALENDAR</h2>
            <span className="section-sub">Large-cap companies · next 7 days · market cap ≥ $10B</span>
          </div>
          <EarningsTable />
        </div>

        <div style={sectionStyle(tab === 'bubble')}>
          <BubbleWatch />
        </div>
      </main>
    </>
  );
}
