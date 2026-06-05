import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import {
  hasConflict, weekday, toMin, istanbulNow, DATE_RE, type Busy,
} from '@/projects/randevu/slots';

const TIME_RE = /^\d{2}:\d{2}$/;

// Public: yeni randevu talebi (status = pending)
export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const b = await req.json().catch(() => ({} as any));

  const customer_name = String(b.customer_name || '').trim();
  const phone = String(b.phone || '').trim();
  const date = String(b.date || '').trim();
  const time = String(b.time || '').trim();
  const note = String(b.note || '').trim() || null;
  const serviceId = b.service_id;
  const staffIdRaw = b.staff_id;

  if (!customer_name) return bad('Ad soyad gerekli');
  if (phone.replace(/\D/g, '').length < 7) return bad('Geçerli bir telefon gerekli');
  if (!DATE_RE.test(date)) return bad('Geçerli bir tarih gerekli');
  if (!TIME_RE.test(time)) return bad('Geçerli bir saat gerekli');

  // Salon (slug veya id)
  const salon: any = await findSalon(b.salon_slug, b.salon_id);
  if (!salon) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

  // Hizmet
  const svr = await db.execute({
    sql: 'SELECT id, name, duration_min FROM randevu_services WHERE id = ? AND salon_id = ? AND is_active = 1',
    args: [serviceId, salon.id],
  });
  const service: any = svr.rows[0];
  if (!service) return bad('Geçerli bir hizmet seçin');

  // Usta gerekli mi? (salonda aktif usta varsa zorunlu)
  const staffCountR = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM randevu_staff WHERE salon_id = ? AND is_active = 1',
    args: [salon.id],
  });
  const hasStaff = Number((staffCountR.rows[0] as any).n) > 0;
  let staff_id: number | null = null;
  if (hasStaff) {
    if (!staffIdRaw) return bad('Lütfen bir usta seçin');
    const str = await db.execute({
      sql: 'SELECT id FROM randevu_staff WHERE id = ? AND salon_id = ? AND is_active = 1',
      args: [staffIdRaw, salon.id],
    });
    if (!str.rows[0]) return bad('Geçersiz usta seçimi');
    staff_id = Number(staffIdRaw);
  }

  // Tarih/saat doğrulama
  const now = istanbulNow();
  if (date < now.dateStr || (date === now.dateStr && toMin(time) < now.minutes)) {
    return bad('Geçmiş bir saat seçilemez');
  }
  const workDays = String(salon.work_days || '').split(',').map((s: string) => s.trim());
  if (!workDays.includes(String(weekday(date)))) return bad('Salon bu gün kapalı');

  const startM = toMin(time);
  const endM = startM + Number(service.duration_min);
  if (startM < toMin(salon.open_time) || endM > toMin(salon.close_time)) {
    return bad('Seçilen saat çalışma saatleri dışında');
  }

  // Çakışma kontrolü (sunucu tarafı — yarış durumunu önler)
  let busySql = `SELECT time, duration_min FROM randevu_appointments
                  WHERE salon_id = ? AND date = ? AND status IN ('pending','approved')`;
  const busyArgs: any[] = [salon.id, date];
  if (staff_id != null) { busySql += ' AND staff_id = ?'; busyArgs.push(staff_id); }
  const busyRows = await db.execute({ sql: busySql, args: busyArgs });
  const busy: Busy[] = (busyRows.rows as any[]).map(r => ({ time: r.time, duration_min: r.duration_min }));
  if (hasConflict(time, Number(service.duration_min), busy)) {
    return NextResponse.json({ error: 'Bu saat az önce doldu, lütfen başka bir saat seçin' }, { status: 409 });
  }

  const ins = await db.execute({
    sql: `INSERT INTO randevu_appointments
            (salon_id, service_id, service_name, duration_min, staff_id, customer_name, phone, date, time, status, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [salon.id, service.id, service.name, service.duration_min, staff_id,
           customer_name, phone, date, time, note],
  });

  return NextResponse.json({
    success: true,
    id: ins.lastInsertRowid,
    salon: salon.name,
    service: service.name,
    date, time,
    status: 'pending',
  }, { status: 201 });
}

async function findSalon(slug: any, id: any) {
  if (slug) {
    const r = await db.execute({
      sql: 'SELECT * FROM randevu_salons WHERE slug = ? AND is_active = 1',
      args: [String(slug)],
    });
    return r.rows[0] || null;
  }
  if (id) {
    const r = await db.execute({
      sql: 'SELECT * FROM randevu_salons WHERE id = ? AND is_active = 1',
      args: [id],
    });
    return r.rows[0] || null;
  }
  return null;
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
