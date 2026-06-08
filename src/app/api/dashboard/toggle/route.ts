import { NextRequest, NextResponse } from 'next/server';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { setSystemActive } from '@/lib/dashboard-systems';
import { PROJECTS } from '@/lib/projects';

// Bir sistemi aktif/pasif yap — sadece admin (Bearer token).
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const { slug, active } = await req.json().catch(() => ({}));
  if (!PROJECTS.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: 'Geçersiz sistem' }, { status: 400 });
  }

  await setSystemActive(String(slug), Boolean(active));
  return NextResponse.json({ ok: true, slug, active: Boolean(active) });
}
