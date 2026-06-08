import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { DATE_RE, istanbulNow } from '@/projects/randevu/slots';

// Salon işlem takibi / raporları — tarih aralığı + (opsiyonel) salon bazında
// durum dağılımı ve CSV için satır listesi.
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const url = new URL(req.url);
  const today = istanbulNow().dateStr;
  // Varsayılan: son 30 gün
  const defFrom = new Date(Date.now() - 29 * 86400_000 + 3 * 3600_000).toISOString().slice(0, 10);
  let from = (url.searchParams.get('from') || '').trim() || defFrom;
  let to = (url.searchParams.get('to') || '').trim() || today;
  if (!DATE_RE.test(from)) from = defFrom;
  if (!DATE_RE.test(to)) to = today;
  if (from > to) { const t = from; from = to; to = t; }
  const salonId = (url.searchParams.get('salon_id') || '').trim();

  const where = ['a.date >= ?', 'a.date <= ?'];
  const args: any[] = [from, to];
  if (salonId) { where.push('a.salon_id = ?'); args.push(salonId); }
  const wsql = 'WHERE ' + where.join(' AND ');

  // Salon bazında durum dağılımı
  const bySalon = await db.execute({
    sql: `SELECT s.id AS salon_id, s.name,
                 COUNT(*) AS total,
                 SUM(CASE WHEN a.status='approved'  THEN 1 ELSE 0 END) AS approved,
                 SUM(CASE WHEN a.status='done'      THEN 1 ELSE 0 END) AS done,
                 SUM(CASE WHEN a.status='noshow'    THEN 1 ELSE 0 END) AS noshow,
                 SUM(CASE WHEN a.status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
                 SUM(CASE WHEN a.status='pending'   THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN a.status='rejected'  THEN 1 ELSE 0 END) AS rejected
            FROM randevu_appointments a
            JOIN randevu_salons s ON s.id = a.salon_id
            ${wsql}
           GROUP BY s.id, s.name
           ORDER BY total DESC`,
    args,
  });

  // Toplamlar
  const totals = { total: 0, approved: 0, done: 0, noshow: 0, cancelled: 0, pending: 0, rejected: 0 };
  for (const r of bySalon.rows as any[]) {
    for (const k of Object.keys(totals)) (totals as any)[k] += Number((r as any)[k] || 0);
  }

  // CSV / detay için satırlar
  const rows = await db.execute({
    sql: `SELECT a.date, a.time, s.name AS salon, a.customer_name, a.phone, a.email,
                 a.service_name, a.duration_min, a.status, a.code
            FROM randevu_appointments a
            JOIN randevu_salons s ON s.id = a.salon_id
            ${wsql}
           ORDER BY a.date DESC, a.time DESC
           LIMIT 5000`,
    args,
  });

  return NextResponse.json({ range: { from, to }, totals, bySalon: bySalon.rows, rows: rows.rows });
}
