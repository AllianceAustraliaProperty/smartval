import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  images: {
    domains: ['aap356-my.sharepoint.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security headers
  async headers() {
    // Get API URL from environment or use default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    return [
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options to prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options to prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com;
              style-src 'self' 'unsafe-inline' fonts.googleapis.com https://cdnjs.cloudflare.com;
              img-src 'self' data: blob: https: ${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : ''};
              font-src 'self' fonts.gstatic.com https://cdnjs.cloudflare.com;
              connect-src 'self' ${process.env.NODE_ENV === 'development' ? `ws: wss: ${apiUrl}` : apiUrl} https://*.sharepoint.com https://*.microsoftonline.com https://*.googleapis.com https://*.firebaseapp.com https://*.firebase.google.com https://*.s3.amazonaws.com  https://maps.googleapis.com;
              frame-ancestors 'none';
              base-uri 'self';
              form-action 'self';
              upgrade-insecure-requests;
            `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ];
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
