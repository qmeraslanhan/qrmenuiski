import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { orderTiming, fmtTime } from '@/projects/siparis-takip/timing';
import { botNotifier } from '@/projects/siparis-takip/bot-notifier';
import { pushBildirim } from '@/projects/siparis-takip/data';

// İş kuralı 4 — Akıllı Alarm tarayıcı (alarmScheduler eşdeğeri).
// Cloudflare Cron Trigger (cron/ worker'ı) veya cron-job.org ile dakikalık çağrılır.
// Koruma: ?key=CRON_SECRET (yoksa endpoint kapalı).
// Her sipariş için ALARM bir kez tetiklenir (alarm_fired); Hazır olunca temizlenir (data.ts).
export async function GET(req: NextRequest) {
  await ensureSiparisInit();

  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET tanımlı değil' }, { status: 503 });
  const key = new URL(req.url).searchParams.get('key') || req.headers.get('x-cron-key') || '';
  if (key !== secret) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const now = Date.now();
  const r = await db.execute('SELECT * FROM siparis_takip_siparisler WHERE alarm_fired = 0');
  let fired = 0;

  for (const o of r.rows as any[]) {
    const t = orderTiming({ etkinlik_ts: Number(o.etkinlik_ts), durum: o.durum }, now);
    if (!t.alarm) continue;
    await db.execute({ sql: 'UPDATE siparis_takip_siparisler SET alarm_fired = 1 WHERE id = ?', args: [o.id] });
    await pushBildirim(
      'alarm',
      `Kritik: ${o.kod} ${o.talep_eden_birim}`,
      `Hazır olma vaktine 1 saatten az — etkinlik ${fmtTime(Number(o.etkinlik_ts))}. Bot bildirimi tetiklendi.`,
      Number(o.id), now
    );
    await botNotifier({ kod: o.kod, birim: o.talep_eden_birim, etkinlik_ts: Number(o.etkinlik_ts) });
    fired++;
  }

  return NextResponse.json({ now, scanned: r.rows.length, fired });
}
