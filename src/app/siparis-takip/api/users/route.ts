import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { guard, listUsers, createUser } from '@/projects/siparis-takip/auth';
import { logActivity } from '@/projects/siparis-takip/activity';

// GET → kullanıcı listesi (yalnız yönetici)
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  return NextResponse.json(await listUsers());
}

// POST → kullanıcı oluştur (yalnız yönetici)
export async function POST(req: NextRequest) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => ({} as any));
  const r = await createUser(b.ad, b.kullaniciAdi, b.sifre, b.rol, b.unvan);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
  await logActivity(g.ctx, 'kullanici.olustur', 'kullanici', r.id, `${String(b.ad || '').trim()} (${b.kullaniciAdi}) eklendi — ${b.rol}`);
  return NextResponse.json({ id: r.id }, { status: 201 });
}
