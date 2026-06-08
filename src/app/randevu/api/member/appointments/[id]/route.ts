import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getMember } from '@/projects/randevu/member-auth';
import { logActivity } from '@/projects/randevu/activity';
import {
  hasConflict, weekday, toMin, istanbulNow, DATE_RE, breakBusy, type Busy,
} from '@/projects/randevu/slots';

const TIME_RE = /^\d{2}:\d{2}$/;

// Üye kendi randevusunu iptal eder veya erteler
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const member = await getMember(req);
  if (!member) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
  const { id } = await params;

  const ar = await db.execute({ sql: 'SELECT * FROM randevu_appointments WHERE id = ? AND member_id = ?', args: [id, member.id] });
  const appt: any = ar.rows[0];
  if (!appt) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 });
  if (!['pending', 'approved'].includes(appt.status)) {
    return NextResponse.json({ error: 'Bu randevu üzerinde işlem yapılamaz' }, { status: 400 });
  }

  // Geçmiş randevu mu?
  const now = istanbulNow();
  const isPast = appt.date < now.dateStr || (appt.date === now.dateStr && toMin(appt.time) <= now.minutes);
  if (isPast) return NextResponse.json({ error: 'Geçmiş randevu değiştirilemez' }, { status: 400 });

  const b = await req.json().catch(() => ({} as any));
  const action = String(b.action || '');

  // ── İptal ──
  if (action === 'cancel') {
    await db.execute({
      sql: `UPDATE randevu_appointments SET status='cancelled', decided_note='Üye iptal etti', decided_at=CURRENT_TIMESTAMP WHERE id=?`,
      args: [id],
    });
    await logActivity(
      { type: 'member', id: member.id, name: member.name },
      'appointment.cancel', 'appointment', Number(id),
      `${member.name} randevusunu iptal etti — ${appt.service_name || ''} · ${appt.date} ${appt.time}`
    );
    return NextResponse.json({ success: true, status: 'cancelled' });
  }

  // ── Erteleme ──
  if (action === 'reschedule') {
    const date = String(b.date || '').trim();
    const time = String(b.time || '').trim();
    if (!DATE_RE.test(date) || !TIME_RE.test(time)) return NextResponse.json({ error: 'Geçerli tarih/saat gerekli' }, { status: 400 });

    const sr = await db.execute({ sql: 'SELECT * FROM randevu_salons WHERE id = ? AND is_active = 1', args: [appt.salon_id] });
    const salon: any = sr.rows[0];
    if (!salon) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

    // Yeni tarih/saat geçmiş olamaz
    if (date < now.dateStr || (date === now.dateStr && toMin(time) < now.minutes)) {
      return NextResponse.json({ error: 'Geçmiş bir saat seçilemez' }, { status: 400 });
    }
    const workDays = String(salon.work_days || '').split(',').map((s: string) => s.trim());
    if (!workDays.includes(String(weekday(date)))) return NextResponse.json({ error: 'Salon bu gün kapalı' }, { status: 400 });

    const cl = await db.execute({ sql: 'SELECT 1 FROM randevu_closures WHERE salon_id=? AND date=? LIMIT 1', args: [salon.id, date] });
    if (cl.rows[0]) return NextResponse.json({ error: 'Salon seçilen gün kapalı' }, { status: 400 });

    const dur = Number(appt.duration_min) || 30;
    const startM = toMin(time);
    if (startM < toMin(salon.open_time) || startM + dur > toMin(salon.close_time)) {
      return NextResponse.json({ error: 'Seçilen saat çalışma saatleri dışında' }, { status: 400 });
    }

    // Usta (varsa) — body'den gelebilir, yoksa mevcut
    let staff_id: number | null = appt.staff_id ?? null;
    if (b.staff_id !== undefined && b.staff_id !== null && b.staff_id !== '') {
      const st = await db.execute({ sql: 'SELECT id FROM randevu_staff WHERE id=? AND salon_id=? AND is_active=1', args: [b.staff_id, salon.id] });
      if (!st.rows[0]) return NextResponse.json({ error: 'Geçersiz usta' }, { status: 400 });
      staff_id = Number(b.staff_id);
    }

    // Çakışma (kendisi hariç) + mola
    let busySql = `SELECT time, duration_min FROM randevu_appointments
                    WHERE salon_id=? AND date=? AND status IN ('pending','approved') AND id<>?`;
    const busyArgs: any[] = [salon.id, date, id];
    if (staff_id != null) { busySql += ' AND staff_id=?'; busyArgs.push(staff_id); }
    const busyRows = await db.execute({ sql: busySql, args: busyArgs });
    const busy: Busy[] = [
      ...(busyRows.rows as any[]).map(r => ({ time: r.time, duration_min: r.duration_min })),
      ...breakBusy(salon.break_start, salon.break_end),
    ];
    if (hasConflict(time, dur, busy)) return NextResponse.json({ error: 'Bu saat dolu, başka bir saat seçin' }, { status: 409 });

    await db.execute({
      sql: `UPDATE randevu_appointments SET date=?, time=?, staff_id=?, status='approved', reminder_sent=0, decided_note='Üye erteledi', decided_at=CURRENT_TIMESTAMP WHERE id=?`,
      args: [date, time, staff_id, id],
    });
    await logActivity(
      { type: 'member', id: member.id, name: member.name },
      'appointment.reschedule', 'appointment', Number(id),
      `${member.name} randevusunu erteledi — ${appt.date} ${appt.time} → ${date} ${time}`
    );
    return NextResponse.json({ success: true, status: 'approved', date, time });
  }

  return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
}
