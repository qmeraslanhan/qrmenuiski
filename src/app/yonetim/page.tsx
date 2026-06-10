import { PROJECTS } from '@/lib/projects';
import { getSystemStatuses } from '@/lib/dashboard-systems';
import YonetimPanel from '@/components/YonetimPanel';

// Durumlar D1'den anlık okunur
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Yönetim Paneli',
  robots: { index: false, follow: false },
};

export default async function YonetimPage() {
  const statuses = await getSystemStatuses();
  const rows = PROJECTS.map((p) => ({
    slug: p.slug,
    title: p.title,
    active: statuses[p.slug] !== false,
    href: p.href,
    adminHref: p.adminHref || p.href,
    status: p.status,
  }));
  return <YonetimPanel rows={rows} />;
}
