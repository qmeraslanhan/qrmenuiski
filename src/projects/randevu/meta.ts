// Bu projenin dashboard'da nasıl görüneceği.
// `src/lib/projects.ts` bu dosyayı import edip listeye ekler.
import type { ProjectMeta } from '@/lib/projects';

const meta: ProjectMeta = {
  slug: 'randevu',
  title: 'Berber & Kuaför Randevu',
  description: 'Berber ve kuaförler için online randevu sistemi: müşteri hizmet, gün ve saat seçer; işletme panelden onaylar. Çalışma saatleri ve dolu saatler otomatik yönetilir.',
  href: '/randevu',
  status: 'beta',
  tags: ['Next.js', 'Cloudflare D1', 'Randevu'],
  icon: 'calendar',
};

export default meta;
