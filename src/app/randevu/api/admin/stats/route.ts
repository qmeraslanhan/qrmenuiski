import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { istanbulNow } from '@/projects/randevu/slots';

// Admin özet kartları
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const _g = await guard(req, 'viewer');
  if ('res' in _g) return _g.res;

  const today = istanbulNow().dateStr;
  const weekEnd = new Date(Date.now() + 3 * 3600 * 1000 + 7 * 86400 * 1000).toISOString().slice(0, 10);

  const one = async (sql: string, args: any[] = []) =>
    Number((((await db.execute({ sql, args })).rows[0]) as any)?.n || 0);

  const [todayN, upcoming, week, cancelled, noshow, members] = await Promise.all([
    one(`SELECT COUNT(*) n FROM randevu_appointments WHERE date=? AND status IN ('approved','pending')`, [today]),
    one(`SELECT COUNT(*) n FROM randevu_appointments WHERE date>=? AND status='approved'`, [today]),
    one(`SELECT COUNT(*) n FROM randevu_appointments WHERE date BETWEEN ? AND ? AND status='approved'`, [today, weekEnd]),
    one(`SELECT COUNT(*) n FROM randevu_appointments WHERE status='cancelled'`),
    one(`SELECT COUNT(*) n FROM randevu_appointments WHERE status='noshow'`),
    one(`SELECT COUNT(*) n FROM randevu_members`),
  ]);

  return NextResponse.json({ today: todayN, upcoming, week, cancelled, noshow, members });
}
