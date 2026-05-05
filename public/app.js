const CATS = ['top', 'agentic', 'startups', 'semiconductors', 'ipo'];

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
  setStatus('LOADING', 'loading');
  await Promise.all([loadNews(), loadStocks()]);
}

init();
setInterval(loadNews, 5 * 60 * 1000);
setInterval(loadStocks, 30 * 1000);
