import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import {
  hasConflict, weekday, toMin, istanbulNow, DATE_RE, type Busy,
} from '@/projects/randevu/slots';
import { getMember } from '@/projects/randevu/member-auth';
import { sendEmail, bookingEmailHtml } from '@/projects/randevu/email';

const TIME_RE = /^\d{2}:\d{2}$/;

// Üye randevu talebi (status = pending). Üye girişi ZORUNLU.
export async function POST(req: NextRequest) {
  await ensureRandevuInit();

  const member = await getMember(req);
  if (!member) {
    return NextResponse.json({ error: 'Randevu almak için üye girişi yapın' }, { status: 401 });
  }

  const b = await req.json().catch(() => ({} as any));

  // Ad/telefon üyeden gelir; form override edebilir
  const customer_name = (String(b.customer_name || '').trim() || member.name);
  const phone = (String(b.phone || '').trim() || member.phone);
  const email = member.email;
  const date = String(b.date || '').trim();
  const time = String(b.time || '').trim();
  const note = String(b.note || '').trim() || null;
  const serviceId = b.service_id;
  const staffIdRaw = b.staff_id;

  if (!customer_name) return bad('Ad soyad gerekli');
  if (phone.replace(/\D/g, '').length < 7) return bad('Geçerli bir telefon gerekli');
  if (!DATE_RE.test(date)) return bad('Geçerli bir tarih gerekli');
  if (!TIME_RE.test(time)) return bad('Geçerli bir saat gerekli');

  const salon: any = await findSalon(b.salon_slug, b.salon_id);
  if (!salon) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

  const svr = await db.execute({
    sql: 'SELECT id, name, duration_min FROM randevu_services WHERE id = ? AND salon_id = ? AND is_active = 1',
    args: [serviceId, salon.id],
  });
  const service: any = svr.rows[0];
  if (!service) return bad('Geçerli bir hizmet seçin');

  // Usta gerekli mi?
  const staffCountR = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM randevu_staff WHERE salon_id = ? AND is_active = 1',
    args: [salon.id],
  });
  const hasStaff = Number((staffCountR.rows[0] as any).n) > 0;
  let staff_id: number | null = null;
  let staff_name: string | null = null;
  if (hasStaff) {
    if (!staffIdRaw) return bad('Lütfen bir usta seçin');
    const str = await db.execute({
      sql: 'SELECT id, name FROM randevu_staff WHERE id = ? AND salon_id = ? AND is_active = 1',
      args: [staffIdRaw, salon.id],
    });
    const st: any = str.rows[0];
    if (!st) return bad('Geçersiz usta seçimi');
    staff_id = Number(st.id);
    staff_name = st.name;
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

  // Çakışma kontrolü (sunucu tarafı)
  let busySql = `SELECT time, duration_min FROM randevu_appointments
                  WHERE salon_id = ? AND date = ? AND status IN ('pending','approved')`;
  const busyArgs: any[] = [salon.id, date];
  if (staff_id != null) { busySql += ' AND staff_id = ?'; busyArgs.push(staff_id); }
  const busyRows = await db.execute({ sql: busySql, args: busyArgs });
  const busy: Busy[] = (busyRows.rows as any[]).map(r => ({ time: r.time, duration_min: r.duration_min }));
  if (hasConflict(time, Number(service.duration_min), busy)) {
    return NextResponse.json({ error: 'Bu saat az önce doldu, lütfen başka bir saat seçin' }, { status: 409 });
  }

  // Otomatik onay — randevu anında 'approved'
  const ins = await db.execute({
    sql: `INSERT INTO randevu_appointments
            (salon_id, service_id, service_name, duration_min, staff_id, member_id, customer_name, phone, email, date, time, status, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
    args: [salon.id, service.id, service.name, service.duration_min, staff_id, member.id,
           customer_name, phone, email, date, time, note],
  });

  // Onay maili (Resend) — hata randevuyu bozmaz
  let mailed = false;
  try {
    const r = await sendEmail({
      to: email,
      subject: `Randevunuz Onaylandı — ${salon.name}`,
      html: bookingEmailHtml({
        name: customer_name, salon: salon.name, service: service.name,
        staff: staff_name, date, time,
      }),
    });
    mailed = r.ok;
  } catch { /* yut */ }

  return NextResponse.json({
    success: true,
    id: ins.lastInsertRowid,
    salon: salon.name,
    service: service.name,
    date, time,
    status: 'approved',
    mailed,
    email,
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
