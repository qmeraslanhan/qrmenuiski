import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';

// Admin: randevu listesi (status / date / salon filtreli)
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const date = url.searchParams.get('date') || '';
  const salonId = url.searchParams.get('salon_id') || '';

  const where: string[] = [];
  const args: any[] = [];
  if (status && status !== 'all') { where.push('a.status = ?'); args.push(status); }
  if (date) { where.push('a.date = ?'); args.push(date); }
  if (salonId) { where.push('a.salon_id = ?'); args.push(salonId); }

  const sql = `
    SELECT a.*, s.name AS salon_name, st.name AS staff_name
      FROM randevu_appointments a
      LEFT JOIN randevu_salons s ON s.id = a.salon_id
      LEFT JOIN randevu_staff st ON st.id = a.staff_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY a.date DESC, a.time DESC, a.id DESC
     LIMIT 500`;
  const r = await db.execute({ sql, args });
  return NextResponse.json(r.rows);
}
