import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getMember } from '@/projects/randevu/member-auth';

// Üye bilgisi + kendi randevuları
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const member = await getMember(req);
  if (!member) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });

  const appts = await db.execute({
    sql: `SELECT a.id, a.service_name, a.date, a.time, a.status, a.duration_min,
                 s.name AS salon_name, st.name AS staff_name
            FROM randevu_appointments a
            LEFT JOIN randevu_salons s ON s.id = a.salon_id
            LEFT JOIN randevu_staff st ON st.id = a.staff_id
           WHERE a.member_id = ?
           ORDER BY a.date DESC, a.time DESC, a.id DESC
           LIMIT 100`,
    args: [member.id],
  });
  return NextResponse.json({ member, appointments: appts.rows });
}
