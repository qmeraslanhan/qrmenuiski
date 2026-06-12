import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';

// PATCH → kullanıcı yetkisi güncelle (şimdilik: tesis ekleyebilme) — yalnız admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const b = await req.json().catch(() => ({} as any));
  if (b.canCreateFac === undefined) return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
  const info = await db.execute({
    sql: 'UPDATE users SET can_create_fac = ? WHERE id = ?',
    args: [b.canCreateFac ? 1 : 0, id],
  });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true, can_create_fac: b.canCreateFac ? 1 : 0 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const info = await db.execute({ sql: 'DELETE FROM users WHERE id=?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true });
}
