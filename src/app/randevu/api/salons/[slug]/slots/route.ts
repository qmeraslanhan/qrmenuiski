import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import {
  availableSlots, weekday, istanbulNow, DATE_RE, type Busy,
} from '@/projects/randevu/slots';

// Public: belirli gün + hizmet (+ usta) için uygun saatler
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await ensureRandevuInit();
  const { slug } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || '';
  const serviceId = url.searchParams.get('service_id') || '';
  const staffId = url.searchParams.get('staff_id') || '';

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'Geçerli bir tarih gerekli (YYYY-MM-DD)' }, { status: 400 });
  }

  const sr = await db.execute({
    sql: 'SELECT * FROM randevu_salons WHERE slug = ? AND is_active = 1',
    args: [slug],
  });
  const salon: any = sr.rows[0];
  if (!salon) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

  // Hizmet süresi
  const svr = await db.execute({
    sql: 'SELECT duration_min FROM randevu_services WHERE id = ? AND salon_id = ? AND is_active = 1',
    args: [serviceId, salon.id],
  });
  const service: any = svr.rows[0];
  if (!service) return NextResponse.json({ error: 'Hizmet bulunamadı' }, { status: 400 });

  // Geçmiş tarih?
  const now = istanbulNow();
  if (date < now.dateStr) return NextResponse.json({ slots: [], reason: 'past' });

  // Çalışma günü mü?
  const workDays = String(salon.work_days || '').split(',').map((s: string) => s.trim());
  if (!workDays.includes(String(weekday(date)))) {
    return NextResponse.json({ slots: [], reason: 'closed' });
  }

  // Dolu randevular (usta varsa usta bazında)
  let busySql = `SELECT time, duration_min FROM randevu_appointments
                  WHERE salon_id = ? AND date = ? AND status IN ('pending','approved')`;
  const busyArgs: any[] = [salon.id, date];
  if (staffId) { busySql += ' AND staff_id = ?'; busyArgs.push(staffId); }
  const busyRows = await db.execute({ sql: busySql, args: busyArgs });
  const busy: Busy[] = (busyRows.rows as any[]).map(r => ({ time: r.time, duration_min: r.duration_min }));

  const slots = availableSlots({
    open: salon.open_time,
    close: salon.close_time,
    step: salon.slot_minutes,
    serviceDuration: service.duration_min,
    busy,
    nowMin: date === now.dateStr ? now.minutes : null,
  });

  return NextResponse.json({ slots, duration_min: service.duration_min, slot_minutes: salon.slot_minutes });
}
