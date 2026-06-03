import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, canAccessFacility, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id: fid } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!canAccessFacility(auth, fid)) return forbidden('Bu tesise erişim yetkiniz yok');

  const r = await db.execute({
    sql: 'SELECT * FROM categories WHERE facility_id=? ORDER BY sort_order, id',
    args: [fid],
  });
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id: fid } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!canAccessFacility(auth, fid)) return forbidden('Bu tesise erişim yetkiniz yok');

  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Kategori adı zorunludur' }, { status: 400 });

  const info = await db.execute({
    sql: 'INSERT INTO categories (facility_id, name, sort_order) VALUES (?, ?, ?)',
    args: [fid, name, parseInt(b.sort_order) || 0],
  });
  const r = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [info.lastInsertRowid!] });
  return NextResponse.json(r.rows[0], { status: 201 });
}
