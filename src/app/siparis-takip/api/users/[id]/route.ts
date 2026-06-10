import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { guard, updateUser, deleteUser } from '@/projects/siparis-takip/auth';
import { logActivity } from '@/projects/siparis-takip/activity';

// PATCH → kullanıcı güncelle (ad, kullaniciAdi, rol, unvan, is_active, sifre) — yalnız yönetici
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const fields = { ad: b.ad, kullaniciAdi: b.kullaniciAdi, rol: b.rol, unvan: b.unvan, is_active: b.is_active, password: b.sifre };
  const r = await updateUser(Number(id), fields);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
  await logActivity(g.ctx, 'kullanici.guncelle', 'kullanici', Number(id), `Kullanıcı #${id} güncellendi`);
  return NextResponse.json({ ok: true });
}

// DELETE → kullanıcı sil (yalnız yönetici)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const { id } = await params;
  // Kendi hesabını silmeyi engelle (süper yönetici zaten DB'de değil)
  if (g.ctx.id != null && Number(g.ctx.id) === Number(id)) {
    return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 });
  }
  const ok = await deleteUser(Number(id));
  if (!ok) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  await logActivity(g.ctx, 'kullanici.sil', 'kullanici', Number(id), `Kullanıcı #${id} silindi`);
  return NextResponse.json({ ok: true });
}
