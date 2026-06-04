import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'İSKİ Sosyal İşler Şube Müdürlüğü',
    template: '%s — İSKİ Sosyal İşler Şube Müdürlüğü',
  },
  description: 'İSKİ Sosyal İşler Şube Müdürlüğü dijital hizmetler portalı.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'İSKİ Sosyal İşler Şube Müdürlüğü',
    url: 'https://omeraslanhan.com',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:wght@400;500;600;700;800;900&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
