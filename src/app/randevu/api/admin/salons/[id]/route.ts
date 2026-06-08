import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import { db, isUniqueError } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';
import { parseSalonInput } from '@/projects/randevu/admin-util';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const cur = await db.execute({ sql: 'SELECT * FROM randevu_salons WHERE id = ?', args: [id] });
  const existing: any = cur.rows[0];
  if (!existing) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

  const b = await req.json().catch(() => ({} as any));
  const f = parseSalonInput(b, existing);
  if (!f.name) return NextResponse.json({ error: 'Salon adı zorunludur' }, { status: 400 });

  const slug = f.name !== existing.name
    ? slugify(f.name, { lower: true, strict: true, locale: 'tr' })
    : existing.slug;

  try {
    await db.execute({
      sql: `UPDATE randevu_salons SET
              name=?, slug=?, type=?, description=?, address=?, phone=?, image_url=?,
              open_time=?, close_time=?, break_start=?, break_end=?, slot_minutes=?, work_days=?, is_active=?, sort_order=?
            WHERE id=?`,
      args: [f.name, slug, f.type, f.description, f.address, f.phone, f.image_url,
             f.open_time, f.close_time, f.break_start, f.break_end, f.slot_minutes, f.work_days, f.is_active, f.sort_order, id],
    });
    await logActivity(
      { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
      'salon.update', 'salon', Number(id), `${_g.ctx.name} salonu güncelledi: ${f.name}`
    );
    const row = await db.execute({ sql: 'SELECT * FROM randevu_salons WHERE id = ?', args: [id] });
    return NextResponse.json(row.rows[0]);
  } catch (err: any) {
    if (isUniqueError(err)) return NextResponse.json({ error: 'Bu isimde bir salon zaten var' }, { status: 409 });
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  // İlişkili hizmet/usta/randevuları temizle (D1'de FK cascade garanti değil)
  await db.execute({ sql: 'DELETE FROM randevu_appointments WHERE salon_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM randevu_services WHERE salon_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM randevu_staff WHERE salon_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM randevu_closures WHERE salon_id = ?', args: [id] });
  const nm = await db.execute({ sql: 'SELECT name FROM randevu_salons WHERE id = ?', args: [id] });
  const sName = (nm.rows[0] as any)?.name || ('#' + id);
  const info = await db.execute({ sql: 'DELETE FROM randevu_salons WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });
  await logActivity(
    { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
    'salon.delete', 'salon', Number(id), `${_g.ctx.name} salonu sildi: ${sName}`
  );
  return NextResponse.json({ success: true });
}
