// Dashboard'da listelenecek projeler.
// Yeni proje eklemek için: bu listeye ekle + src/app/(projects)/<slug>/ altına Next.js sayfası koy.

export type Project = {
  slug: string;
  title: string;
  description: string;
  href: string;
  status: 'live' | 'beta' | 'soon';
  tags: string[];
  accent: string; // tailwind gradient class veya hex
  icon: string;   // emoji veya SVG path id
};

export const PROJECTS: Project[] = [
  {
    slug: 'qr-menu',
    title: 'QR Menü Sistemi',
    description: 'İSKİ tesisleri için çoklu-tesis dijital menü, QR kod ve A3 yatay fiyat listesi PDF üretimi.',
    href: '/qr-menu',
    status: 'live',
    tags: ['Next.js', 'Turso', 'Cloudinary'],
    accent: 'from-amber-500 to-orange-600',
    icon: '🍽️',
  },
];
