'use client';

import { useEffect, useState } from 'react';
import TabNav from './components/TabNav';
import NewsFeed from './components/NewsFeed';
import CalendarFeed from './components/CalendarFeed';
import EarningsTable from './components/EarningsTable';
import BubbleWatch from './components/BubbleWatch';
import OptionsCalculator from './components/OptionsCalculator';

const NEWS_CATS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo'] as const;
const ALL_TABS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo', 'calendar', 'earnings', 'bubble', 'options'];

function getInitialTab(): string {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '');
    if (ALL_TABS.includes(hash)) return hash;
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
      if (h && ALL_TABS.includes(h)) setTab(h);
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

  const show = (id: string): React.CSSProperties => tab === id ? {} : { display: 'none' };

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
          <div key={cat} className="section" data-cat={cat} style={show(cat)}>
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

        <div className="section" data-cat="calendar" style={show('calendar')}>
          <div className="section-header">
            <h2>ECONOMIC CALENDAR</h2>
            <span className="section-sub">FOMC, macro releases, key AI earnings</span>
          </div>
          <CalendarFeed />
        </div>

        <div className="section" data-cat="earnings" style={show('earnings')}>
          <div className="section-header">
            <h2>EARNINGS CALENDAR</h2>
            <span className="section-sub">Large-cap companies · next 7 days · market cap ≥ $10B</span>
          </div>
          <EarningsTable />
        </div>

        <div style={show('bubble')}>
          <BubbleWatch />
        </div>

        <div className="section" data-cat="options" style={show('options')}>
          <div className="section-header">
            <h2>OPTIONS CALCULATOR</h2>
            <span className="section-sub">Black-Scholes pricing · Greeks · P&amp;L diagram</span>
          </div>
          <OptionsCalculator />
        </div>
      </main>
    </>
  );
}
