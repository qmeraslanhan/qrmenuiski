// Bu projenin dashboard'da nasıl görüneceği.
// `src/lib/projects.ts` bu dosyayı import edip listeye ekler.
import type { ProjectMeta } from '@/lib/projects';

const meta: ProjectMeta = {
  slug: 'siparis-takip',
  title: 'İkramlık & Sipariş Takip',
  description:
    'Kurumsal ikram siparişlerini girer, iç üretim ambarı / ihale firması ayrımıyla yönlendirir; renk kodu, canlı geri sayım ve kritik gecikme alarmı ile zamanında hazır olmasını takip eder.',
  href: '/siparis-takip',
  status: 'beta',
  tags: ['Next.js', 'Cloudflare D1', 'Operasyon'],
  icon: 'siparis',
};

export default meta;
