import { NextRequest, NextResponse } from 'next/server';
import { db, isUniqueError } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

// Salona atanmış operatörler (üyeler)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const r = await db.execute({
    sql: `SELECT o.id, o.member_id, o.created_at, m.name, m.email, m.phone
            FROM randevu_salon_operators o
            JOIN randevu_members m ON m.id = o.member_id
           WHERE o.salon_id = ?
           ORDER BY m.name`,
    args: [id],
  });
  return NextResponse.json(r.rows);
}

// E-posta ile bir üyeyi salona operatör olarak ata
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const b = await req.json().catch(() => ({} as any));
  const email = String(b.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Üye e-postası gerekli' }, { status: 400 });

  const salon = await db.execute({ sql: 'SELECT id FROM randevu_salons WHERE id = ?', args: [id] });
  if (!salon.rows[0]) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

  const mr = await db.execute({ sql: 'SELECT id, name, email, phone FROM randevu_members WHERE email = ?', args: [email] });
  const m: any = mr.rows[0];
  if (!m) return NextResponse.json({ error: 'Bu e-posta ile kayıtlı üye yok. Önce üye olmalı.' }, { status: 404 });

  try {
    const ins = await db.execute({
      sql: 'INSERT INTO randevu_salon_operators (salon_id, member_id) VALUES (?, ?)',
      args: [id, m.id],
    });
    await logActivity(
      { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
      'operator.assign', 'salon', Number(id), `${_g.ctx.name}, ${m.name} (${m.email}) kullanıcısını salona atadı`
    );
    return NextResponse.json(
      { id: Number(ins.lastInsertRowid), member_id: Number(m.id), name: m.name, email: m.email, phone: m.phone },
      { status: 201 }
    );
  } catch (err: any) {
    if (isUniqueError(err)) return NextResponse.json({ error: 'Bu üye zaten bu salona atanmış' }, { status: 409 });
    throw err;
  }
}
