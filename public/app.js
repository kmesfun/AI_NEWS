const CATS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo'];
const ALL_TABS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo', 'calendar', 'earnings'];

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

function renderFeed(cat, items) {
  const ul = document.getElementById(`feed-${cat}`);
  const countEl = document.getElementById(`count-${cat}`);
  countEl.textContent = items.length;
  if (!items.length) {
    ul.innerHTML = '<li class="empty">No items yet</li>';
    return;
  }
  ul.innerHTML = items.slice(0, 25).map((item) => `
    <li onclick="window.open('${encodeURI(item.link)}', '_blank', 'noopener')">
      <div class="row">
        <span class="src">${escapeHTML(item.source)}</span>
        <span class="time">${relTime(item.publishedAt)}</span>
      </div>
      <div class="title">${escapeHTML(item.title)}</div>
      ${item.snippet ? `<div class="snippet">${escapeHTML(item.snippet)}</div>` : ''}
    </li>
  `).join('');
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
  await Promise.all([loadNews(), loadStocks(), loadCalendar(), loadEarnings()]);
}

init();
setInterval(loadNews, 5 * 60 * 1000);
setInterval(loadStocks, 30 * 1000);
setInterval(loadCalendar, 60 * 60 * 1000);
setInterval(loadEarnings, 60 * 60 * 1000);
