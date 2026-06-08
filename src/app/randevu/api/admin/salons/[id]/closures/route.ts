import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { DATE_RE } from '@/projects/randevu/slots';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const r = await db.execute({
    sql: 'SELECT * FROM randevu_closures WHERE salon_id = ? ORDER BY date',
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
  const date = String(b.date || '').trim();
  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Geçerli bir tarih gerekli' }, { status: 400 });
  const reason = String(b.reason || '').trim() || null;

  // Aynı gün varsa tekrar ekleme
  const ex = await db.execute({ sql: 'SELECT id FROM randevu_closures WHERE salon_id=? AND date=?', args: [id, date] });
  if (ex.rows[0]) return NextResponse.json({ error: 'Bu gün zaten kapalı olarak işaretli' }, { status: 409 });

  const ins = await db.execute({
    sql: 'INSERT INTO randevu_closures (salon_id, date, reason) VALUES (?, ?, ?)',
    args: [id, date, reason],
  });
  const row = await db.execute({ sql: 'SELECT * FROM randevu_closures WHERE id = ?', args: [ins.lastInsertRowid] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
