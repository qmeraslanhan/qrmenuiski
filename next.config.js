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

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

module.exports = nextConfig;
