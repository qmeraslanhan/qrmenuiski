import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard, updateAdminUser, deleteAdminUser, ROLE_LABEL } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

// Yönetici kullanıcı güncelle (rol/aktiflik/şifre) — yalnızca 'admin'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const g = await guard(req, 'admin');
  if ('res' in g) return g.res;
  const { id } = await params;

  // Kendini pasife alma / rolünü düşürme koruması
  if (g.ctx.id != null && String(g.ctx.id) === String(id)) {
    const b0 = await req.clone().json().catch(() => ({} as any));
    if (b0.is_active === 0 || b0.is_active === false) {
      return NextResponse.json({ error: 'Kendi hesabınızı pasife alamazsınız' }, { status: 400 });
    }
    if (b0.role !== undefined && b0.role !== 'admin') {
      return NextResponse.json({ error: 'Kendi yönetici rolünüzü düşüremezsiniz' }, { status: 400 });
    }
  }

  const b = await req.json().catch(() => ({} as any));
  const res = await updateAdminUser(id, b);
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 });

  const parts: string[] = [];
  if (b.role !== undefined) parts.push('rol: ' + (ROLE_LABEL[b.role as keyof typeof ROLE_LABEL] || b.role));
  if (b.is_active !== undefined) parts.push(b.is_active ? 'aktifleştirildi' : 'pasife alındı');
  if (b.password) parts.push('şifre değiştirildi');
  if (b.name !== undefined) parts.push('ad güncellendi');
  await logActivity(
    { type: 'admin', id: g.ctx.id, name: g.ctx.name },
    'user.update', 'admin_user', id,
    `${g.ctx.name}, #${id} kullanıcıyı güncelledi (${parts.join(', ') || 'değişiklik'})`
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const g = await guard(req, 'admin');
  if ('res' in g) return g.res;
  const { id } = await params;

  if (g.ctx.id != null && String(g.ctx.id) === String(id)) {
    return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 });
  }
  const ok = await deleteAdminUser(id);
  if (!ok) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  await logActivity(
    { type: 'admin', id: g.ctx.id, name: g.ctx.name },
    'user.delete', 'admin_user', id, `${g.ctx.name}, #${id} kullanıcıyı sildi`
  );
  return NextResponse.json({ success: true });
}
