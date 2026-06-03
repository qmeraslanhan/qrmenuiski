import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, canAccessFacility, unauthorized, forbidden } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  await ensureInit();
  const { fid } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!canAccessFacility(auth, fid)) return forbidden('Bu tesise erişim yetkiniz yok');

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return NextResponse.json({ error: 'Boş içerik' }, { status: 400 });

  const byCategory = new Map<string, Array<{ name: string; price: number; description: string | null }>>();
  for (const it of items) {
    const cat = String(it.category || '').trim();
    const name = String(it.name || '').trim();
    if (!cat || !name) continue;
    const price = Number(it.price) || 0;
    const description = String(it.description || '').trim() || null;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push({ name, price, description });
  }

  let categoriesAdded = 0, productsAdded = 0;
  for (const [catName, products] of byCategory) {
    const cr = await db.execute({
      sql: 'SELECT id FROM categories WHERE facility_id = ? AND name = ?',
      args: [fid, catName],
    });
    let catId: number;
    if (cr.rows[0]) {
      catId = Number((cr.rows[0] as any).id);
    } else {
      const ins = await db.execute({
        sql: 'INSERT INTO categories (facility_id, name, sort_order) VALUES (?, ?, 0)',
        args: [fid, catName],
      });
      catId = Number(ins.lastInsertRowid);
      categoriesAdded++;
    }

    for (const p of products) {
      const exists = await db.execute({
        sql: 'SELECT 1 FROM products WHERE category_id = ? AND name = ?',
        args: [catId, p.name],
      });
      if (exists.rows[0]) continue;
      await db.execute({
        sql: 'INSERT INTO products (category_id, name, description, price) VALUES (?, ?, ?, ?)',
        args: [catId, p.name, p.description, p.price],
      });
      productsAdded++;
    }
  }

  return NextResponse.json({ categoriesAdded, productsAdded });
}
