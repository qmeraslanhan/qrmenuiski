import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const r = await db.execute({
    sql: 'SELECT * FROM randevu_services WHERE salon_id = ? ORDER BY sort_order, id',
    args: [id],
  });
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Hizmet adı zorunludur' }, { status: 400 });
  const duration = Math.min(600, Math.max(5, Math.round(Number(b.duration_min) || 30)));
  const price = Math.max(0, Number(b.price) || 0);

  const ins = await db.execute({
    sql: `INSERT INTO randevu_services (salon_id, name, duration_min, price, sort_order)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, name, duration, price, Math.round(Number(b.sort_order) || 0)],
  });
  const row = await db.execute({ sql: 'SELECT * FROM randevu_services WHERE id = ?', args: [ins.lastInsertRowid] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
