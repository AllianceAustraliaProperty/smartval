import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  images: {
    domains: ['aap356-my.sharepoint.com'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security headers
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    // Only include the API URL in connect-src when it is an absolute URL
    // (CSP rejects bare paths like "/api" — same-origin is already covered by 'self').
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const apiSource = /^https?:\/\//.test(apiUrl) ? apiUrl : '';

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com https://cdnjs.cloudflare.com",
      `img-src 'self' data: blob: https:${isProd ? '' : ' http://localhost:5000'}`,
      "font-src 'self' fonts.gstatic.com https://cdnjs.cloudflare.com",
      `connect-src 'self'${apiSource ? ` ${apiSource}` : ''}${isProd ? '' : ' ws: wss: http://localhost:5000'} https://*.sharepoint.com https://*.microsoftonline.com https://*.googleapis.com https://*.firebaseapp.com https://*.firebase.google.com https://*.s3.amazonaws.com https://maps.googleapis.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // upgrade-insecure-requests rewrites in-page http:// fetches to https://;
      // on localhost over plain http this breaks dev, so production-only.
      ...(isProd ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    const headers = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: csp },
    ];

    // HSTS pins the host to https for max-age. On localhost over plain http
    // this locks dev into ERR_SSL_PROTOCOL_ERROR, so production-only.
    if (isProd) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [{ source: '/(.*)', headers }];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    return config;
  },

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Generate ETag for caching
  generateEtags: true,

  // Development specific settings
  ...(process.env.NODE_ENV === 'development' && {
    // Only in development
    reactStrictMode: true,
  }),

  // Production specific settings
  ...(process.env.NODE_ENV === 'production' && {
    // Only in production
    reactStrictMode: true,
    // Enable compression
    compress: true,
  }),
};

export default nextConfig;
