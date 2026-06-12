import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import slugify from 'slugify';
import { db, ensureInit, isUniqueError } from '@/lib/db';
import { getAuth, isAdmin, unauthorized, forbidden, refreshUserFacilities } from '@/lib/auth';
import { uploadImage } from '@/lib/r2';
import { logActivity } from '@/projects/qr-menu/activity';

export async function GET(req: NextRequest) {
  await ensureInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();

  if (isAdmin(auth)) {
    const r = await db.execute('SELECT * FROM facilities ORDER BY created_at DESC');
    return NextResponse.json(r.rows);
  }

  const ids = [...auth.facilityIds];
  if (!ids.length) return NextResponse.json([]);
  const placeholders = ids.map(() => '?').join(',');
  const r = await db.execute({
    sql: `SELECT * FROM facilities WHERE id IN (${placeholders}) ORDER BY name`,
    args: ids,
  });
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  // Admin VEYA "tesis ekleyebilir" yetkisi verilmiş kullanıcı
  if (!isAdmin(auth) && !auth.canCreateFac) return forbidden('Tesis ekleme yetkiniz yok');

  // Multipart veya JSON
  const ct = req.headers.get('content-type') || '';
  let name = '', description = '', theme_color: string | null = null, phone: string | null = null, hours_text: string | null = null;
  let logoFile: File | null = null;

  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    name = String(fd.get('name') || '').trim();
    description = String(fd.get('description') || '').trim();
    theme_color = (fd.get('theme_color') as string) || null;
    phone = String(fd.get('phone') || '').trim() || null;
    hours_text = String(fd.get('hours_text') || '').trim() || null;
    const file = fd.get('logo');
    if (file instanceof File && file.size > 0) logoFile = file;
  } else {
    const b = await req.json().catch(() => ({}));
    name = String(b.name || '').trim();
    description = String(b.description || '').trim();
    theme_color = b.theme_color || null;
    phone = b.phone?.trim() || null;
    hours_text = b.hours_text?.trim() || null;
  }

  if (!name) return NextResponse.json({ error: 'Tesis adı zorunludur' }, { status: 400 });

  const slug = slugify(name, { lower: true, strict: true, locale: 'tr' });
  let logo_url: string | null = null;
  if (logoFile) {
    const buf = await logoFile.arrayBuffer();
    logo_url = await uploadImage(buf, logoFile.name || 'logo.png', 'logos');
  }

  try {
    const info = await db.execute({
      sql: 'INSERT INTO facilities (name, slug, description, logo_url, theme_color, phone, hours_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [name, slug, description || null, logo_url, theme_color, phone, hours_text],
    });
    const fr = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [info.lastInsertRowid!] });
    const facility: any = fr.rows[0];

    // Yetkili kullanıcı ekledi ise tesis otomatik kendisine atanır (yoksa göremez)
    if (!isAdmin(auth)) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO user_facilities (user_id, facility_id) VALUES (?, ?)',
        args: [auth.userId, facility.id],
      });
      const all = await db.execute({ sql: 'SELECT facility_id FROM user_facilities WHERE user_id = ?', args: [auth.userId] });
      await refreshUserFacilities(auth.userId, (all.rows as any[]).map((r) => Number(r.facility_id)));
    }

    await logActivity(auth, 'tesis.olustur', 'tesis', facility.id, `${name} eklendi`);

    const host = req.headers.get('host') || 'iskisosyaltesisler.com';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const menuUrl = `${proto}://${host}/qr-menu/menu/${slug}`;
    const qrCode = await QRCode.toDataURL(menuUrl, { width: 300, margin: 2 });

    return NextResponse.json({ ...facility, qrCode, menuUrl }, { status: 201 });
  } catch (err: any) {
    if (isUniqueError(err)) return NextResponse.json({ error: 'Bu isimde bir tesis zaten mevcut' }, { status: 409 });
    throw err;
  }
}
