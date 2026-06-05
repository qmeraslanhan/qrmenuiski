import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const cur = await db.execute({ sql: 'SELECT * FROM randevu_services WHERE id = ?', args: [id] });
  const e: any = cur.rows[0];
  if (!e) return NextResponse.json({ error: 'Hizmet bulunamadı' }, { status: 404 });

  const b = await req.json().catch(() => ({} as any));
  const name = b.name !== undefined ? String(b.name).trim() || e.name : e.name;
  const duration = b.duration_min !== undefined
    ? Math.min(600, Math.max(5, Math.round(Number(b.duration_min) || e.duration_min))) : e.duration_min;
  const price = b.price !== undefined ? Math.max(0, Number(b.price) || 0) : e.price;
  const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : e.is_active;
  const sort_order = b.sort_order !== undefined ? Math.round(Number(b.sort_order) || 0) : e.sort_order;

  await db.execute({
    sql: 'UPDATE randevu_services SET name=?, duration_min=?, price=?, is_active=?, sort_order=? WHERE id=?',
    args: [name, duration, price, is_active, sort_order, id],
  });
  const row = await db.execute({ sql: 'SELECT * FROM randevu_services WHERE id = ?', args: [id] });
  return NextResponse.json(row.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const info = await db.execute({ sql: 'DELETE FROM randevu_services WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Hizmet bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true });
}
