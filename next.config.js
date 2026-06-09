/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,


  // HTML dosyalarını webpack bundle'ına raw string olarak embed et
  // (Vercel serverless Lambda'da fs.readFile cold-start gecikmesini önler)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.html$/,
      type: 'asset/source',
    });
    return config;
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

  // Güvenlik header'ları — tüm yollara. (CSP burada minimal: clickjacking +
  // object engeli; inline script'leri kırmaz. Sıkı script CSP'si Tailwind
  // self-host + inline script temizliğinden sonra ayrı adımda gelecek.)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
