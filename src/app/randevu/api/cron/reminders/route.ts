import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { sendEmail, reminderEmailHtml } from '@/projects/randevu/email';

// Yaklaşan (yarınki) randevular için hatırlatma maili gönderir.
// Günde 1 kez çağrılmalı (Cloudflare Cron Trigger / cron-job.org).
// Koruma: ?key=CRON_SECRET  (secret yoksa endpoint kapalı).
export async function GET(req: NextRequest) {
  await ensureRandevuInit();

  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET tanımlı değil' }, { status: 503 });
  const key = new URL(req.url).searchParams.get('key') || req.headers.get('x-cron-key') || '';
  if (key !== secret) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  // Yarının tarihi (İstanbul = UTC+3)
  const target = new Date(Date.now() + 3 * 3600 * 1000 + 86400 * 1000).toISOString().slice(0, 10);

  const r = await db.execute({
    sql: `SELECT a.*, s.name AS salon_name, st.name AS staff_name
            FROM randevu_appointments a
            LEFT JOIN randevu_salons s ON s.id = a.salon_id
            LEFT JOIN randevu_staff st ON st.id = a.staff_id
           WHERE a.date = ? AND a.status = 'approved' AND a.reminder_sent = 0
             AND a.email IS NOT NULL AND a.email <> ''
           LIMIT 200`,
    args: [target],
  });

  let sent = 0;
  for (const a of r.rows as any[]) {
    try {
      const res = await sendEmail({
        to: a.email,
        subject: `Randevu Hatırlatması — ${a.salon_name || ''}`,
        html: reminderEmailHtml({
          name: a.customer_name, salon: a.salon_name || '', service: a.service_name || '',
          staff: a.staff_name, date: a.date, time: a.time,
          durationMin: Number(a.duration_min), code: a.code,
        }),
      });
      // Sadece gerçekten gönderildiyse işaretle (atlanırsa RESEND bağlanınca tekrar denenir)
      if (res.ok) {
        await db.execute({ sql: 'UPDATE randevu_appointments SET reminder_sent = 1 WHERE id = ?', args: [a.id] });
        sent++;
      }
    } catch { /* sıradakine geç */ }
  }

  return NextResponse.json({ target, candidates: r.rows.length, sent });
}
