'use client';

import { useEffect, useState } from 'react';
import type { EarningsRow } from '@/lib/types';

function fmtMcap(mc: number): string {
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(0)}B`;
  return `$${(mc / 1e6).toFixed(0)}M`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export default function EarningsTable() {
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/earnings')
      .then(r => r.json())
      .then(j => {
        setRows(j.data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="earnings-wrap">
        <table className="earnings-table">
          <tbody><tr><td className="empty">Loading earnings…</td></tr></tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="earnings-wrap">
        <table className="earnings-table">
          <tbody><tr><td className="empty">No large-cap earnings in next 7 days</td></tr></tbody>
        </table>
      </div>
    );
  }

  const byDay: Record<string, EarningsRow[]> = {};
  for (const row of rows) {
    if (!byDay[row.date]) byDay[row.date] = [];
    byDay[row.date].push(row);
  }
  const days = Object.keys(byDay).sort();

  return (
    <div className="earnings-wrap">
      <table className="earnings-table">
        <thead>
          <tr>
            <th>SYM</th>
            <th>COMPANY</th>
            <th className="num">MARKET CAP</th>
            <th className="num">EPS EST</th>
            <th className="num">LAST YR EPS</th>
            <th>QTR END</th>
            <th>TIME</th>
          </tr>
        </thead>
        <tbody>
          {days.flatMap(date => [
            <tr key={`div-${date}`} className="day-divider">
              <td colSpan={7}>{fmtDate(date)}</td>
            </tr>,
            ...byDay[date].map((row, i) => {
              const t = (row.time ?? '').toUpperCase();
              const timeTag = t === 'PRE MARKET' || t === 'BMO' ? 'bmo' : t === 'POST MARKET' || t === 'AMC' ? 'amc' : 'tbd';
              const timeLabel = t === 'PRE MARKET' || t === 'BMO' ? 'BMO' : t === 'POST MARKET' || t === 'AMC' ? 'AMC' : row.time || 'TBD';
              return (
                <tr key={`${date}-${i}`}>
                  <td><span className="sym">{row.symbol}</span></td>
                  <td><span className="co">{row.name}</span></td>
                  <td className="num"><span className="mc">{fmtMcap(row.marketCap)}</span></td>
                  <td className="num"><span className="eps">{row.epsForecast || '—'}</span></td>
                  <td className="num"><span className="ly-eps">{row.lastYearEps || '—'}</span></td>
                  <td><span className="qtr">{row.fiscalQuarter || '—'}</span></td>
                  <td><span className={`time-tag ${timeTag}`}>{timeLabel}</span></td>
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>
    </div>
  );
}
