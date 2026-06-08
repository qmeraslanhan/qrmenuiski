import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { hasConflict, type Busy } from '@/projects/randevu/slots';

const VALID = ['pending', 'approved', 'rejected', 'cancelled', 'noshow', 'done'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const cur = await db.execute({ sql: 'SELECT * FROM randevu_appointments WHERE id = ?', args: [id] });
  const appt: any = cur.rows[0];
  if (!appt) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 });

  const b = await req.json().catch(() => ({} as any));
  const status = String(b.status || '').trim();
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 });
  const decided_note = b.decided_note !== undefined ? (String(b.decided_note).trim() || null) : appt.decided_note;

  // Onaylarken: aynı salon/gün(/usta) için onaylı bir randevuyla çakışma var mı?
  if (status === 'approved') {
    let sql = `SELECT time, duration_min FROM randevu_appointments
                WHERE salon_id = ? AND date = ? AND status = 'approved' AND id <> ?`;
    const a: any[] = [appt.salon_id, appt.date, appt.id];
    if (appt.staff_id != null) { sql += ' AND staff_id = ?'; a.push(appt.staff_id); }
    const rows = await db.execute({ sql, args: a });
    const busy: Busy[] = (rows.rows as any[]).map(r => ({ time: r.time, duration_min: r.duration_min }));
    if (hasConflict(appt.time, appt.duration_min, busy)) {
      return NextResponse.json(
        { error: 'Bu saat için zaten onaylı bir randevu var — çakışma nedeniyle onaylanamadı' },
        { status: 409 }
      );
    }
  }

  await db.execute({
    sql: `UPDATE randevu_appointments SET status = ?, decided_note = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [status, decided_note, id],
  });
  const row = await db.execute({ sql: 'SELECT * FROM randevu_appointments WHERE id = ?', args: [id] });
  return NextResponse.json(row.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const info = await db.execute({ sql: 'DELETE FROM randevu_appointments WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true });
}
