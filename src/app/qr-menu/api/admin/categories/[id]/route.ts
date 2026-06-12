import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, canAccessFacility, unauthorized, forbidden } from '@/lib/auth';
import { logActivity } from '@/projects/qr-menu/activity';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  const cr = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [id] });
  const c: any = cr.rows[0];
  if (!c) return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
  if (!canAccessFacility(auth, c.facility_id)) return forbidden('Bu kategoriye erişim yetkiniz yok');

  const b = await req.json().catch(() => ({}));
  await db.execute({
    sql: 'UPDATE categories SET name=?, sort_order=? WHERE id=?',
    args: [
      String(b.name || c.name).trim() || c.name,
      b.sort_order !== undefined ? parseInt(b.sort_order) : c.sort_order,
      id,
    ],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [id] });
  await logActivity(auth, 'kategori.duzenle', 'kategori', id, `${(updated.rows[0] as any)?.name || c.name} güncellendi`);
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  const cr = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [id] });
  const c: any = cr.rows[0];
  if (!c) return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
  if (!canAccessFacility(auth, c.facility_id)) return forbidden('Bu kategoriye erişim yetkiniz yok');

  await db.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [id] });
  await logActivity(auth, 'kategori.sil', 'kategori', id, `${c.name} kategorisi silindi (ürünleriyle)`);
  return NextResponse.json({ success: true });
}
