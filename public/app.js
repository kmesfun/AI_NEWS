const CATS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo'];
const ALL_TABS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo', 'calendar', 'earnings', 'bubble'];

// Shared state so headlines and bubble can re-render together
let _latestHeadlines = [];
let _latestBubbleAlerts = []; // {item, indicators[]}
let _bubbleIndMap = {};       // id → indicator

const statusEl = document.getElementById('status');
const clockEl = document.getElementById('clock');
const tickerTrack = document.getElementById('ticker-track');

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = kind || '';
}

function pad(n) { return String(n).padStart(2, '0'); }
function tickClock() {
  const d = new Date();
  clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(tickClock, 1000);
tickClock();

function relTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'JUST NOW';
  if (m < 60) return `${m}M AGO`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}H AGO`;
  const d = Math.floor(h / 24);
  return `${d}D AGO`;
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function newsItemHTML(item) {
  return `
    <li onclick="window.open('${encodeURI(item.link)}', '_blank', 'noopener')">
      <div class="row">
        <span class="src">${escapeHTML(item.source)}</span>
        <span class="time">${relTime(item.publishedAt)}</span>
      </div>
      <div class="title">${escapeHTML(item.title)}</div>
      ${item.snippet ? `<div class="snippet">${escapeHTML(item.snippet)}</div>` : ''}
    </li>
  `;
}

function bubbleAlertHTML(alert) {
  const { item, indicators } = alert;
  const worstSev = indicators.reduce((acc, ind) => {
    const order = { red: 3, orange: 2, yellow: 1, green: 0 };
    return (order[ind.severity] > order[acc]) ? ind.severity : acc;
  }, 'yellow');
  const tags = indicators.map((ind) =>
    `<span class="alert-ind-tag sev-${ind.severity}">${escapeHTML(ind.label)}</span>`
  ).join('');
  return `
    <li class="bubble-alert-item sev-${worstSev}"
        onclick="window.open('${encodeURI(item.link)}', '_blank', 'noopener')">
      <div class="alert-banner">
        <span class="alert-icon">⚠</span>
        <span class="alert-label">BUBBLE WATCH ALERT</span>
        <span class="alert-ind-tags">${tags}</span>
        <span class="alert-time">${relTime(item.publishedAt)}</span>
      </div>
      <div class="title">${escapeHTML(item.title)}</div>
      <div class="row"><span class="src">${escapeHTML(item.source)}</span></div>
      ${item.snippet ? `<div class="snippet">${escapeHTML(item.snippet)}</div>` : ''}
    </li>
  `;
}

function renderHeadlines() {
  const ul = document.getElementById('feed-top');
  const countEl = document.getElementById('count-top');

  const alertHTML = _latestBubbleAlerts.slice(0, 5).map(bubbleAlertHTML).join('');
  const newsHTML = _latestHeadlines.slice(0, 25).map(newsItemHTML).join('');
  const total = _latestBubbleAlerts.length + _latestHeadlines.length;
  countEl.textContent = total || '--';

  if (!alertHTML && !newsHTML) {
    ul.innerHTML = '<li class="empty">No items yet</li>';
    return;
  }

  // Divider between alerts and regular news
  const divider = alertHTML && newsHTML
    ? `<li class="feed-divider"><span>LATEST HEADLINES</span></li>`
    : '';

  ul.innerHTML = alertHTML + divider + newsHTML;
}

function renderFeed(cat, items) {
  if (cat === 'top') {
    _latestHeadlines = items;
    renderHeadlines();
    return;
  }
  const ul = document.getElementById(`feed-${cat}`);
  const countEl = document.getElementById(`count-${cat}`);
  countEl.textContent = items.length;
  if (!items.length) {
    ul.innerHTML = '<li class="empty">No items yet</li>';
    return;
  }
  ul.innerHTML = items.slice(0, 25).map(newsItemHTML).join('');
}

function fmtPrice(n) {
  if (n == null) return '--';
  return n >= 1000 ? n.toFixed(0) : n >= 100 ? n.toFixed(2) : n.toFixed(2);
}
function fmtChange(pct) {
  if (pct == null) return '--';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function renderTicker(quotes) {
  if (!quotes.length) {
    tickerTrack.innerHTML = '<span class="ticker-loading">No market data available</span>';
    tickerTrack.style.animation = 'none';
    return;
  }
  const block = quotes.map((q) => {
    const dir = q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'dn' : 'flat';
    const arrow = q.changePercent > 0 ? '▲' : q.changePercent < 0 ? '▼' : '◆';
    return `
      <span class="tick">
        <span class="sym">${escapeHTML(q.symbol)}</span>
        <span class="px">${fmtPrice(q.price)}</span>
        <span class="chg ${dir}"><span class="arrow">${arrow}</span> ${fmtChange(q.changePercent)}</span>
      </span>
    `;
  }).join('');
  tickerTrack.innerHTML = block + block;
  tickerTrack.style.animation = '';
}

async function loadNews() {
  try {
    const res = await fetch('/api/news');
    if (!res.ok) throw new Error('news fetch failed');
    const { data } = await res.json();
    for (const cat of CATS) renderFeed(cat, data[cat] || []);
    setStatus('LIVE', '');
  } catch (err) {
    setStatus('NEWS ERROR', 'error');
    console.error(err);
  }
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function renderCalendar(events) {
  const ul = document.getElementById('feed-calendar');
  const countEl = document.getElementById('count-calendar');
  countEl.textContent = events.length;
  if (!events.length) {
    ul.innerHTML = '<li class="empty">No upcoming events</li>';
    return;
  }
  const now = new Date();
  ul.innerHTML = events.map((ev) => {
    const [y, m, d] = ev.date.split('-').map(Number);
    const evDate = new Date(Date.UTC(y, m - 1, d));
    const diffDays = Math.round((evDate - new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) / 86400000);
    const isImminent = diffDays <= 3;
    const countdown =
      diffDays === 0 ? 'TODAY' :
      diffDays === 1 ? 'TOMORROW' :
      diffDays < 7 ? `IN ${diffDays}D` :
      diffDays < 30 ? `IN ${Math.floor(diffDays / 7)}W` :
      `IN ${Math.floor(diffDays / 30)}MO`;
    return `
      <li class="${isImminent ? 'imminent' : ''}">
        <div class="when">
          <span class="mon">${MONTHS[m - 1]}</span>
          <span class="day">${String(d).padStart(2, '0')}</span>
        </div>
        <div class="what">
          <span class="ev">${escapeHTML(ev.event)}</span>
          <span class="kind ${ev.kind}">${escapeHTML(ev.kind)}</span>
          <span class="countdown">${countdown}</span>
        </div>
        <div class="time">${escapeHTML(ev.time)} ET</div>
      </li>
    `;
  }).join('');
}

async function loadCalendar() {
  try {
    const res = await fetch('/api/calendar');
    if (!res.ok) throw new Error('calendar fetch failed');
    const { data } = await res.json();
    renderCalendar(data || []);
  } catch (err) {
    console.error(err);
  }
}

// ---- Earnings ----
function fmtMarketCap(n) {
  if (!n || !Number.isFinite(n)) return '--';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

function timeTagFor(time) {
  if (time === 'time-pre-market') return { cls: 'bmo', label: 'BMO' };
  if (time === 'time-after-hours') return { cls: 'amc', label: 'AMC' };
  return { cls: 'tbd', label: 'TBD' };
}

function fmtEarningsDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = ['SUN','MON','TUE','WED','THU','FRI','SAT'][dt.getUTCDay()];
  return `${weekday} ${MONTHS[m - 1]} ${String(d).padStart(2, '0')}`;
}

function renderEarnings(rows) {
  const tbody = document.getElementById('tbody-earnings');
  const countEl = document.getElementById('count-earnings');
  countEl.textContent = rows.length;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">No earnings in the next 7 days</td></tr>';
    return;
  }
  let lastDate = '';
  const html = [];
  for (const r of rows) {
    if (r.date !== lastDate) {
      html.push(`<tr class="day-divider"><td colspan="8">${fmtEarningsDate(r.date)}</td></tr>`);
      lastDate = r.date;
    }
    const tag = timeTagFor(r.time);
    html.push(`
      <tr>
        <td>${escapeHTML(r.date)}</td>
        <td><span class="time-tag ${tag.cls}">${tag.label}</span></td>
        <td class="sym">${escapeHTML(r.symbol)}</td>
        <td class="co">${escapeHTML(r.name)}</td>
        <td class="num mc">${fmtMarketCap(r.marketCap)}</td>
        <td class="num eps">${escapeHTML(r.epsForecast || '--')}</td>
        <td class="num ly-eps">${escapeHTML(r.lastYearEps || '--')}</td>
        <td class="qtr">${escapeHTML(r.fiscalQuarter || '--')}</td>
      </tr>
    `);
  }
  tbody.innerHTML = html.join('');
}

async function loadEarnings() {
  try {
    const res = await fetch('/api/earnings');
    if (!res.ok) throw new Error('earnings fetch failed');
    const { data } = await res.json();
    renderEarnings(data || []);
  } catch (err) {
    console.error(err);
    document.getElementById('tbody-earnings').innerHTML =
      '<tr><td colspan="8" class="empty">Earnings unavailable</td></tr>';
  }
}

// ---- AI Bubble Watch ----
const SEV_LABEL = { green: 'CONTAINED', yellow: 'WATCH', orange: 'WARNING', red: 'DANGER' };

function renderBubble(data) {
  const { composite, indicators, news, analystNote } = data;

  // Composite gauge
  const gauge = document.getElementById('composite-gauge');
  gauge.dataset.severity = composite.severity;
  document.getElementById('cg-score').textContent = composite.label;
  document.getElementById('cg-label').textContent = `Composite: ${composite.score}/4.00`;

  // Build indicator ID → severity map for news tags
  const indMap = {};
  for (const ind of indicators) indMap[ind.id] = ind;
  _bubbleIndMap = indMap;

  // Extract bubble alerts: news matched to RED or ORANGE indicators, deduped, sorted worst-first
  const sevOrder = { red: 3, orange: 2, yellow: 1, green: 0 };
  const alertItems = news
    .map((item) => {
      const matchedInds = (item.matchedIndicators || [])
        .map((id) => indMap[id])
        .filter((ind) => ind && (ind.severity === 'red' || ind.severity === 'orange'));
      return matchedInds.length ? { item, indicators: matchedInds } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aMax = Math.max(...a.indicators.map((i) => sevOrder[i.severity] || 0));
      const bMax = Math.max(...b.indicators.map((i) => sevOrder[i.severity] || 0));
      return bMax - aMax;
    });

  _latestBubbleAlerts = alertItems;
  renderHeadlines(); // re-render headlines with updated alerts

  // Indicator cards
  const container = document.getElementById('bubble-indicators');
  container.innerHTML = indicators.map((ind) => `
    <div class="ind-card">
      <div class="ind-card-top">
        <span class="ind-sev ${ind.severity}"></span>
        <span class="ind-label">${escapeHTML(ind.label)}</span>
        <span class="ind-reading">${escapeHTML(ind.reading)}</span>
        <span class="ind-sev-badge ${ind.severity}">${SEV_LABEL[ind.severity] || ind.severity.toUpperCase()}</span>
      </div>
      <div class="ind-card-body">
        <div class="ind-body-row">
          <span class="ind-body-label">Thesis</span>
          <span class="ind-body-text">${escapeHTML(ind.thesis)}</span>
        </div>
        <div class="ind-body-row">
          <span class="ind-body-label">Dot-com Parallel</span>
          <span class="ind-body-text dot-com">${escapeHTML(ind.dotcomParallel)}</span>
        </div>
        <div class="ind-body-row">
          <span class="ind-body-label">Key Implication</span>
          <span class="ind-body-text implication">${escapeHTML(ind.implication)}</span>
        </div>
        <div class="ind-body-row">
          <span class="ind-body-label">Watch</span>
          <div class="ind-watch-syms">
            ${(ind.watchSymbols || []).map((s) => `<span class="ind-sym-tag">${escapeHTML(s)}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Tagged news feed
  const feedEl = document.getElementById('feed-bubble');
  if (!news.length) {
    feedEl.innerHTML = '<li class="empty">No relevant news matched</li>';
  } else {
    feedEl.innerHTML = news.slice(0, 40).map((item) => {
      const tags = (item.matchedIndicators || []).map((id) => {
        const ind = indMap[id];
        if (!ind) return '';
        return `<span class="ind-tag ${ind.severity}">${escapeHTML(ind.label.split(' ')[0])}</span>`;
      }).join('');
      return `
        <li onclick="window.open('${encodeURI(item.link)}', '_blank', 'noopener')">
          <div class="row">
            <span class="src">${escapeHTML(item.source)}</span>
            <span class="time">${relTime(item.publishedAt)}</span>
          </div>
          <div class="title">${escapeHTML(item.title)}</div>
          <div class="ind-tags">${tags}</div>
        </li>
      `;
    }).join('');
  }

  // Analyst note
  const noteEl = document.getElementById('analyst-note');
  noteEl.textContent = analystNote;
}

async function loadBubble() {
  try {
    const res = await fetch('/api/bubble');
    if (!res.ok) throw new Error('bubble fetch failed');
    const { data } = await res.json();
    renderBubble(data);
  } catch (err) {
    console.error(err);
    document.getElementById('bubble-indicators').innerHTML = '<div class="bubble-loading">Bubble data unavailable</div>';
  }
}

// ---- Tab switching ----
function selectTab(tab) {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
  });
  document.querySelectorAll('.section').forEach((sec) => {
    if (sec.dataset.cat === tab) {
      sec.hidden = false;
      sec.classList.add('active');
    } else {
      sec.hidden = true;
      sec.classList.remove('active');
    }
  });
  if (location.hash.replace('#', '') !== tab) {
    history.replaceState(null, '', `#${tab}`);
  }
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });
  const hashTab = location.hash.replace('#', '');
  if (ALL_TABS.includes(hashTab)) selectTab(hashTab);
  else selectTab('top');
}

async function loadStocks() {
  try {
    const res = await fetch('/api/stocks');
    if (!res.ok) throw new Error('stocks fetch failed');
    const { data } = await res.json();
    renderTicker(data || []);
  } catch (err) {
    console.error(err);
  }
}

async function init() {
  initTabs();
  setStatus('LOADING', 'loading');
  await Promise.all([loadNews(), loadStocks(), loadCalendar(), loadEarnings(), loadBubble()]);
}

init();
setInterval(loadNews, 5 * 60 * 1000);
setInterval(loadStocks, 30 * 1000);
setInterval(loadCalendar, 60 * 60 * 1000);
setInterval(loadEarnings, 60 * 60 * 1000);
setInterval(loadBubble, 10 * 60 * 1000);
