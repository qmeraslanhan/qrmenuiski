import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { loginRole } from '@/projects/siparis-takip/auth';

// POST /siparis-takip/api/auth/login  { rol: 'yonetici' | 'ambar' } → { token, user }
// Prototip demo'su şifresiz — rol seçimiyle oturum açılır.
export async function POST(req: NextRequest) {
  await ensureSiparisInit();
  const b = await req.json().catch(() => ({} as any));
  const r = await loginRole(b.rol);
  if (!r) return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });
  return NextResponse.json(r);
}
