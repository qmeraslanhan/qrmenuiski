import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getMember } from '@/projects/randevu/member-auth';
import { isOperatorOf, operatorSalons } from '@/projects/randevu/operator';
import { DATE_RE, istanbulNow } from '@/projects/randevu/slots';

// Operatörün salonundaki belirli günün randevuları
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const member = await getMember(req);
  if (!member) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });

  const url = new URL(req.url);
  let salonId = url.searchParams.get('salon_id') || '';
  const date = (url.searchParams.get('date') || '').trim() || istanbulNow().dateStr;
  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Geçersiz tarih' }, { status: 400 });

  // salon_id verilmemişse operatörün ilk salonunu kullan
  if (!salonId) {
    const salons = await operatorSalons(member.id);
    if (!salons.length) return NextResponse.json({ error: 'Bu hesap hiçbir salona atanmamış' }, { status: 403 });
    salonId = String(salons[0].id);
  } else if (!(await isOperatorOf(member.id, salonId))) {
    return NextResponse.json({ error: 'Bu salon için yetkiniz yok' }, { status: 403 });
  }

  const r = await db.execute({
    sql: `SELECT a.id, a.code, a.customer_name, a.phone, a.email, a.service_name, a.duration_min,
                 a.date, a.time, a.status, a.note, a.staff_id, st.name AS staff_name
            FROM randevu_appointments a
            LEFT JOIN randevu_staff st ON st.id = a.staff_id
           WHERE a.salon_id = ? AND a.date = ?
           ORDER BY a.time, a.id`,
    args: [salonId, date],
  });
  return NextResponse.json({ salon_id: Number(salonId), date, appointments: r.rows });
}
