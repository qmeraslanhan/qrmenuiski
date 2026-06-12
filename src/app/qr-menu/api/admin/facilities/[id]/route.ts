import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import { db, ensureInit } from '@/lib/db';
import { getAuth, isAdmin, canAccessFacility, unauthorized, forbidden } from '@/lib/auth';
import { uploadImage } from '@/lib/r2';
import { logActivity } from '@/projects/qr-menu/activity';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!canAccessFacility(auth, id)) return forbidden('Bu tesise erişim yetkiniz yok');

  const fr = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [id] });
  const f: any = fr.rows[0];
  if (!f) return NextResponse.json({ error: 'Tesis bulunamadı' }, { status: 404 });

  const ct = req.headers.get('content-type') || '';
  let name = f.name, description = f.description, theme_color = f.theme_color;
  let phone = f.phone, hours_text = f.hours_text;
  let logo_url = f.logo_url;
  let logoFile: File | null = null;
  let removeLogo = false;

  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    if (fd.get('name')) name = String(fd.get('name')).trim();
    if (fd.has('description')) description = String(fd.get('description')).trim() || null;
    if (fd.has('theme_color')) theme_color = (fd.get('theme_color') as string) || null;
    if (fd.has('phone')) phone = String(fd.get('phone')).trim() || null;
    if (fd.has('hours_text')) hours_text = String(fd.get('hours_text')).trim() || null;
    if (fd.get('remove_logo') === 'true') removeLogo = true;
    const file = fd.get('logo');
    if (file instanceof File && file.size > 0) logoFile = file;
  } else {
    const b = await req.json().catch(() => ({}));
    if (b.name !== undefined) name = String(b.name).trim() || f.name;
    if (b.description !== undefined) description = String(b.description).trim() || null;
    if (b.theme_color !== undefined) theme_color = b.theme_color || null;
    if (b.phone !== undefined) phone = b.phone?.trim() || null;
    if (b.hours_text !== undefined) hours_text = b.hours_text?.trim() || null;
    if (b.remove_logo === true || b.remove_logo === 'true') removeLogo = true;
  }

  if (logoFile) {
    const buf = await logoFile.arrayBuffer();
    logo_url = await uploadImage(buf, logoFile.name || 'logo.png', 'logos');
  } else if (removeLogo) {
    logo_url = null;
  }

  const slug = (name && name !== f.name)
    ? slugify(name, { lower: true, strict: true, locale: 'tr' })
    : f.slug;

  await db.execute({
    sql: 'UPDATE facilities SET name=?, slug=?, description=?, logo_url=?, theme_color=?, phone=?, hours_text=? WHERE id=?',
    args: [name, slug, description, logo_url, theme_color, phone, hours_text, id],
  });

  const updated = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [id] });
  await logActivity(auth, 'tesis.duzenle', 'tesis', id, `${name} güncellendi`);
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const fr = await db.execute({ sql: 'SELECT name FROM facilities WHERE id = ?', args: [id] });
  const info = await db.execute({ sql: 'DELETE FROM facilities WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Tesis bulunamadı' }, { status: 404 });
  await logActivity(auth, 'tesis.sil', 'tesis', id, `${(fr.rows[0] as any)?.name || '#' + id} silindi`);
  return NextResponse.json({ success: true });
}
