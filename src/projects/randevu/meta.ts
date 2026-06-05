// Bu projenin dashboard'da nasıl görüneceği.
// `src/lib/projects.ts` bu dosyayı import edip listeye ekler.
import type { ProjectMeta } from '@/lib/projects';

const meta: ProjectMeta = {
  slug: 'randevu',
  title: 'Randevu Sistemi',
  description: 'Birimler için online randevu sistemi: üye giriş yapar, hizmet ile gün ve saat seçer, randevu anında onaylanır. Çalışma saatleri ve dolu saatler otomatik yönetilir.',
  href: '/randevu',
  status: 'beta',
  tags: ['Next.js', 'Cloudflare D1', 'Randevu'],
  icon: 'calendar',
};

export default meta;
