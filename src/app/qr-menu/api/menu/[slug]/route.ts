import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db, ensureInit } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await ensureInit();
  const { slug } = await params;

  const facilityResult = await db.execute({
    sql: 'SELECT * FROM facilities WHERE slug = ?',
    args: [slug],
  });
  const facility: any = facilityResult.rows[0];
  if (!facility) return NextResponse.json({ error: 'Tesis bulunamadı' }, { status: 404 });

  const categoriesResult = await db.execute({
    sql: 'SELECT * FROM categories WHERE facility_id = ? ORDER BY sort_order, id',
    args: [facility.id],
  });

  const categoriesWithProducts: any[] = [];
  for (const cat of categoriesResult.rows as any[]) {
    const productsResult = await db.execute({
      sql: 'SELECT id, name, description, price, image_url FROM products WHERE category_id = ? AND is_active = 1 ORDER BY sort_order, id',
      args: [cat.id],
    });
    if (productsResult.rows.length > 0) {
      categoriesWithProducts.push({ ...cat, products: productsResult.rows });
    }
  }

  // Müşteri-yüzlü URL (yeni Next.js yapısında /qr-menu/menu/<slug>)
  const host = req.headers.get('host') || 'iskisosyaltesisler.com';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const menuUrl = `${proto}://${host}/qr-menu/menu/${facility.slug}`;
  const qrCode = await QRCode.toDataURL(menuUrl, { width: 200, margin: 1 });

  return NextResponse.json({
    facility: {
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
      description: facility.description,
      logo_url: facility.logo_url,
      theme_color: facility.theme_color,
      phone: facility.phone,
      hours_text: facility.hours_text,
    },
    categories: categoriesWithProducts,
    qrCode,
    menuUrl,
  });
}
