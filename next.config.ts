import type { NextConfig } from 'next';

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block clickjacking via iframes
  { key: 'X-Frame-Options', value: 'DENY' },
  // Force HTTPS for 2 years, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable legacy XSS auditor (can introduce vulnerabilities)
  { key: 'X-XSS-Protection', value: '0' },
  // Limit referrer information sent cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser feature access
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy
  // - default-src 'self': only load resources from our own origin by default
  // - script-src: allow Next.js inline scripts (strict-dynamic + nonces not yet wired)
  // - style-src 'unsafe-inline': required for Next.js CSS-in-JS and inline styles
  // - img-src: allow data URIs (SVG chart) and all HTTPS images (news thumbnails)
  // - connect-src: allow Yahoo Finance + RSS fetch calls from server (SSR); browser
  //   fetches only hit our own /api/* routes so 'self' covers them
  // - font-src: Google Fonts (IBM Plex)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed by Next.js dev + webpack
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'", // belt-and-suspenders with X-Frame-Options
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const config: NextConfig = {
  serverExternalPackages: ['rss-parser', 'yahoo-finance2'],

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default config;
