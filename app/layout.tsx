import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import TickerBar from './components/TickerBar';

const ibmMono = IBM_Plex_Mono({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const ibmSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI News Terminal',
  description: 'Bloomberg-style aggregator for AI, semiconductors, startups, and IPO news',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmMono.variable} ${ibmSans.variable}`}>
      <body>
        <TickerBar />
        {children}
        <footer className="statusbar">
          <span>AI NEWS TERMINAL · v2.0</span>
          <span>Data: RSS feeds · Stooq · Nasdaq · ET timezone</span>
          <span>Refresh: news 10m · stocks 30s · earnings 1h</span>
        </footer>
      </body>
    </html>
  );
}
