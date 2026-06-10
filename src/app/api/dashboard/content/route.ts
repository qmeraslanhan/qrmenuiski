import { NextRequest, NextResponse } from 'next/server';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { saveDashboardContent, HEX_RE, DEFAULT_SETTINGS } from '@/lib/dashboard-systems';
import { PROJECTS } from '@/lib/projects';

const MAX_LEN = 400;
const clip = (v: any) => String(v ?? '').slice(0, MAX_LEN);

// Portal içerik + görünüm ayarlarını kaydet — sadece admin.
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const body = await req.json().catch(() => ({} as any));
  const settingsIn = (body.settings || {}) as Record<string, any>;
  const projectsIn = Array.isArray(body.projects) ? body.projects : [];

  // Ayarlar: sadece bilinen anahtarlar, metinler kırpılır
  const settings: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (settingsIn[key] === undefined) continue;
    if (key === 'accent_color') {
      const c = String(settingsIn[key] || '').trim();
      if (c && !HEX_RE.test(c)) {
        return NextResponse.json({ error: 'Vurgu rengi #RRGGBB formatında olmalı (örn. #0F4C81)' }, { status: 400 });
      }
      settings[key] = c;
    } else {
      settings[key] = clip(settingsIn[key]);
    }
  }

  // Projeler: yalnızca kayıtlı slug'lar
  const known = new Set(PROJECTS.map((p) => p.slug));
  const projects = projectsIn
    .filter((p: any) => p && known.has(p.slug))
    .map((p: any, i: number) => ({
      slug: String(p.slug),
      is_active: p.is_active !== false,
      title: clip(p.title),
      description: clip(p.description),
      tags: Array.isArray(p.tags) ? p.tags.map((t: any) => clip(t).trim()).filter(Boolean).slice(0, 8) : [],
      status: String(p.status || ''),
      sort_order: typeof p.sort_order === 'number' ? p.sort_order : i,
    }));

  await saveDashboardContent(settings, projects);
  return NextResponse.json({ ok: true });
}
