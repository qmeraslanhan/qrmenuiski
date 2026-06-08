import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify';
import { db, isUniqueError } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';
import { parseSalonInput } from '@/projects/randevu/admin-util';

export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;

  const r = await db.execute(
    `SELECT s.*,
            (SELECT COUNT(*) FROM randevu_appointments a
              WHERE a.salon_id = s.id AND a.status = 'pending') AS pending_count
       FROM randevu_salons s
      ORDER BY s.sort_order, s.name`
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;

  const b = await req.json().catch(() => ({} as any));
  const f = parseSalonInput(b, {});
  if (!f.name) return NextResponse.json({ error: 'Salon adı zorunludur' }, { status: 400 });

  const slug = slugify(f.name, { lower: true, strict: true, locale: 'tr' });

  try {
    const ins = await db.execute({
      sql: `INSERT INTO randevu_salons
              (name, slug, type, description, address, phone, image_url,
               open_time, close_time, break_start, break_end, slot_minutes, work_days, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [f.name, slug, f.type, f.description, f.address, f.phone, f.image_url,
             f.open_time, f.close_time, f.break_start, f.break_end, f.slot_minutes, f.work_days, f.is_active, f.sort_order],
    });
    await logActivity(
      { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
      'salon.create', 'salon', Number(ins.lastInsertRowid), `${_g.ctx.name} salon ekledi: ${f.name}`
    );
    const row = await db.execute({ sql: 'SELECT * FROM randevu_salons WHERE id = ?', args: [ins.lastInsertRowid] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (err: any) {
    if (isUniqueError(err)) return NextResponse.json({ error: 'Bu isimde bir salon zaten var' }, { status: 409 });
    throw err;
  }
}
