import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const r = await db.execute({
    sql: 'SELECT * FROM randevu_staff WHERE salon_id = ? ORDER BY sort_order, id',
    args: [id],
  });
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Usta adı zorunludur' }, { status: 400 });
  const photo_url = String(b.photo_url || '').trim() || null;

  const ins = await db.execute({
    sql: 'INSERT INTO randevu_staff (salon_id, name, photo_url, sort_order) VALUES (?, ?, ?, ?)',
    args: [id, name, photo_url, Math.round(Number(b.sort_order) || 0)],
  });
  await logActivity(
    { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
    'staff.create', 'staff', Number(ins.lastInsertRowid), `${_g.ctx.name} usta ekledi: ${name}`
  );
  const row = await db.execute({ sql: 'SELECT * FROM randevu_staff WHERE id = ?', args: [ins.lastInsertRowid] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
