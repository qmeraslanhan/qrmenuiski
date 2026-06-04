// Bu projenin dashboard'da nasıl görüneceği.
// `src/lib/projects.ts` bu dosyayı import edip listeye ekler.
import type { ProjectMeta } from '@/lib/projects';

const meta: ProjectMeta = {
  slug: 'qr-menu',
  title: 'QR Menü Sistemi',
  description: 'Tesislerin dijital menüsü, QR kod ile müşteri erişimi, çoklu kategori ve A3 fiyat listesi PDF üretimi.',
  href: '/qr-menu',
  status: 'live',
  tags: ['Next.js', 'Cloudflare D1', 'R2'],
  icon: 'qr',
};

export default meta;
