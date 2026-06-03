import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, unauthorized } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  const pr = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [id] });
  const p: any = pr.rows[0];
  if (!p) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });

  const ct = req.headers.get('content-type') || '';
  let name = p.name, description = p.description, price = p.price;
  let image_url = p.image_url;
  let is_active = p.is_active;
  let sort_order = p.sort_order || 0;
  let imageFile: File | null = null;

  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    if (fd.get('name')) name = String(fd.get('name')).trim();
    if (fd.has('description')) description = String(fd.get('description')).trim() || null;
    if (fd.has('price')) price = parseFloat(String(fd.get('price'))) || 0;
    if (fd.has('is_active')) is_active = parseInt(String(fd.get('is_active')));
    if (fd.has('sort_order')) sort_order = parseInt(String(fd.get('sort_order')));
    if (fd.has('image_url') && !fd.get('image')) image_url = String(fd.get('image_url')) || null;
    const file = fd.get('image');
    if (file instanceof File && file.size > 0) imageFile = file;
  } else {
    const b = await req.json().catch(() => ({}));
    if (b.name !== undefined) name = String(b.name).trim() || p.name;
    if (b.description !== undefined) description = String(b.description).trim() || null;
    if (b.price !== undefined) price = parseFloat(b.price) || 0;
    if (b.is_active !== undefined) is_active = parseInt(b.is_active);
    if (b.sort_order !== undefined) sort_order = parseInt(b.sort_order);
    if (b.image_url !== undefined) image_url = b.image_url;
  }

  if (imageFile) {
    const buf = Buffer.from(await imageFile.arrayBuffer());
    image_url = await uploadToCloudinary(buf);
  }

  await db.execute({
    sql: 'UPDATE products SET name=?, description=?, price=?, image_url=?, is_active=?, sort_order=? WHERE id=?',
    args: [name, description, price, image_url, is_active, sort_order, id],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [id] });
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  const info = await db.execute({ sql: 'DELETE FROM products WHERE id=?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true });
}
