import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const cur = await db.execute({ sql: 'SELECT * FROM randevu_staff WHERE id = ?', args: [id] });
  const e: any = cur.rows[0];
  if (!e) return NextResponse.json({ error: 'Usta bulunamadı' }, { status: 404 });

  const b = await req.json().catch(() => ({} as any));
  const name = b.name !== undefined ? String(b.name).trim() || e.name : e.name;
  const photo_url = b.photo_url !== undefined ? (String(b.photo_url).trim() || null) : e.photo_url;
  const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : e.is_active;
  const sort_order = b.sort_order !== undefined ? Math.round(Number(b.sort_order) || 0) : e.sort_order;

  await db.execute({
    sql: 'UPDATE randevu_staff SET name=?, photo_url=?, is_active=?, sort_order=? WHERE id=?',
    args: [name, photo_url, is_active, sort_order, id],
  });
  const row = await db.execute({ sql: 'SELECT * FROM randevu_staff WHERE id = ?', args: [id] });
  return NextResponse.json(row.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const nm = await db.execute({ sql: 'SELECT name FROM randevu_staff WHERE id = ?', args: [id] });
  const stName = (nm.rows[0] as any)?.name || ('#' + id);
  const info = await db.execute({ sql: 'DELETE FROM randevu_staff WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Usta bulunamadı' }, { status: 404 });
  await logActivity(
    { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
    'staff.delete', 'staff', Number(id), `${_g.ctx.name} usta sildi: ${stName}`
  );
  return NextResponse.json({ success: true });
}
