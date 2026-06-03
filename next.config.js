/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Eski URL'leri yeni Next.js yapısına yönlendir (geriye uyumluluk)
  async redirects() {
    return [
      // Eski menü path → /qr-menu/menu/:slug
      { source: '/menu/:slug', destination: '/qr-menu/menu/:slug', permanent: false },
      // Eski static HTML'ler → yeni qr-menu URL'leri
      { source: '/admin.html', destination: '/qr-menu/admin', permanent: false },
      { source: '/login.html', destination: '/qr-menu/login', permanent: false },
      { source: '/tesisler.html', destination: '/qr-menu', permanent: false },
      { source: '/print-menu.html', destination: '/qr-menu/print', permanent: false },
    ];
  },

  // URL → fiziksel dosya/route eşlemesi (rewrites browser bar'ı değiştirmez)
  async rewrites() {
    return [
      // Yeni QR menü URL'leri public HTML'lere bağlanır (HTML'leri tekrar yazmadan)
      { source: '/qr-menu', destination: '/tesisler.html' },
      { source: '/qr-menu/admin', destination: '/admin.html' },
      { source: '/qr-menu/login', destination: '/login.html' },
      { source: '/qr-menu/menu/:slug', destination: '/menu.html' },
      { source: '/qr-menu/print/:slug', destination: '/print-menu.html' },
      { source: '/qr-menu/print', destination: '/print-menu.html' },

      // Eski API yolları → yeni Route Handler'lar (frontend kodunu değiştirmeden)
      { source: '/api/admin/:path*', destination: '/qr-menu/api/admin/:path*' },
      { source: '/api/menu/:path*', destination: '/qr-menu/api/menu/:path*' },
      { source: '/api/menu',        destination: '/qr-menu/api/menu' },
      { source: '/api/health',      destination: '/qr-menu/api/health' },
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
