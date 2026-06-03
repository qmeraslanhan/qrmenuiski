import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, unauthorized } from '@/lib/auth';
import { uploadImage } from '@/lib/r2';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id: cid } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  const r = await db.execute({
    sql: 'SELECT * FROM products WHERE category_id=? ORDER BY sort_order, id',
    args: [cid],
  });
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id: cid } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  const ct = req.headers.get('content-type') || '';
  let name = '', description: string | null = null, price = 0;
  let imageFile: File | null = null;

  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    name = String(fd.get('name') || '').trim();
    description = String(fd.get('description') || '').trim() || null;
    price = parseFloat(String(fd.get('price') || '0')) || 0;
    const file = fd.get('image');
    if (file instanceof File && file.size > 0) imageFile = file;
  } else {
    const b = await req.json().catch(() => ({}));
    name = String(b.name || '').trim();
    description = String(b.description || '').trim() || null;
    price = parseFloat(b.price) || 0;
  }

  if (!name) return NextResponse.json({ error: 'Ürün adı zorunludur' }, { status: 400 });

  let image_url: string | null = null;
  if (imageFile) {
    const buf = await imageFile.arrayBuffer();
    image_url = await uploadImage(buf, imageFile.name || 'image.jpg', 'products');
  }

  const info = await db.execute({
    sql: 'INSERT INTO products (category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)',
    args: [cid, name, description, price, image_url],
  });
  const r = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [info.lastInsertRowid!] });
  return NextResponse.json(r.rows[0], { status: 201 });
}
