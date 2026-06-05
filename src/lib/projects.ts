// ─────────────────────────────────────────────────────────────────
// Dashboard project registry.
//
// Yeni proje eklemek için 2 adım:
//   1. src/projects/<slug>/meta.ts dosyası oluştur (default export ProjectMeta)
//   2. Bu dosyada `imports` ve `PROJECTS` listesine ekle (manuel — Next.js
//      build zamanı dinamik import desteği sınırlı, en güvenli yöntem bu)
// ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'live' | 'beta' | 'soon';

export type ProjectMeta = {
  slug: string;
  title: string;
  description: string;
  href: string;
  status: ProjectStatus;
  tags: string[];
  icon: string; // SVG id (src/app/page.tsx ProjectIcon switch'inde işlenir)
};

// Kayıtlı projeler — her birinin `src/projects/<slug>/meta.ts` dosyası var.
import qrMenuMeta from '@/projects/qr-menu/meta';
import randevuMeta from '@/projects/randevu/meta';
// Yeni proje: import yeniProjeMeta from '@/projects/yeni-proje/meta';

export const PROJECTS: ProjectMeta[] = [
  qrMenuMeta,
  randevuMeta,
  // yeniProjeMeta,
];

// Eski Project tipini de export et (geriye dönük uyumluluk için page.tsx kullanıyor)
export type Project = ProjectMeta;
