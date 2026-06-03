const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // src/html/ dosyalarını Vercel serverless Lambda bundle'a dahil et
  outputFileTracingIncludes: {
    '/qr-menu': ['./src/html/**/*'],
    '/qr-menu/admin': ['./src/html/**/*'],
    '/qr-menu/login': ['./src/html/**/*'],
    '/qr-menu/menu/[slug]': ['./src/html/**/*'],
    '/qr-menu/print/[slug]': ['./src/html/**/*'],
    '/qr-menu/print': ['./src/html/**/*'],
  },

  // Eski URL'leri yeni yapıya yönlendir (geriye uyumluluk)
  async redirects() {
    return [
      { source: '/menu/:slug', destination: '/qr-menu/menu/:slug', permanent: false },
    ];
  },

  // Eski API yolları → yeni Route Handler'lar (frontend kodunu değiştirmeden)
  async rewrites() {
    return [
      { source: '/api/admin/:path*', destination: '/qr-menu/api/admin/:path*' },
      { source: '/api/menu/:path*',  destination: '/qr-menu/api/menu/:path*' },
      { source: '/api/menu',         destination: '/qr-menu/api/menu' },
      { source: '/api/health',       destination: '/qr-menu/api/health' },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

module.exports = nextConfig;
