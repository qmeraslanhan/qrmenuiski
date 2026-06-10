import { PROJECTS } from '@/lib/projects';
import { getDashboardData } from '@/lib/dashboard-systems';
import YonetimPanel from '@/components/YonetimPanel';

// Durumlar/içerik D1'den anlık okunur
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Yönetim Paneli',
  robots: { index: false, follow: false },
};

export default async function YonetimPage() {
  const { settings, overrides } = await getDashboardData();
  const rows = PROJECTS.map((p, i) => {
    const o = overrides[p.slug];
    return {
      slug: p.slug,
      href: p.href,
      adminHref: p.adminHref || p.href,
      active: o ? o.is_active : true,
      title: o?.title ?? p.title,
      description: o?.description ?? p.description,
      tags: o?.tags ?? p.tags,
      status: (o?.status ?? p.status) as string,
      sort_order: o?.sort_order ?? i,
      def: { title: p.title, description: p.description, tags: p.tags, status: p.status as string },
    };
  }).sort((a, b) => a.sort_order - b.sort_order);

  return <YonetimPanel settings={settings} rows={rows} />;
}
