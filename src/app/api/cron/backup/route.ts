import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { db } from '@/lib/d1';
import { ensureInit } from '@/lib/db';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';

// Günde 1 kez çağrılır (cron-job.org / CF Cron Trigger):
//   GET /api/cron/backup?key=CRON_SECRET
// 1) Tüm D1 tablolarını JSON olarak ÖZEL `qrmenu-backups` bucket'ına yazar
//    (public bucket DEĞİL — PII sızmaz).
// 2) Süresi dolmuş oturum/token/eski login denemelerini temizler.
//
// Not: D1 zaten 30 günlük Time Travel (PITR) sunar; bu, platform-dışı ek kopya
// ve günlük temizlik için savunma katmanıdır.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET tanımlı değil' }, { status: 503 });
  const key = new URL(req.url).searchParams.get('key') || req.headers.get('x-cron-key') || '';
  if (key !== secret) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  await ensureInit();
  await ensureRandevuInit();

  // ── 1) Yedek ──
  const bucket = (getCloudflareContext().env as any).BACKUP_BUCKET;
  if (!bucket) return NextResponse.json({ error: 'BACKUP_BUCKET binding yok' }, { status: 503 });

  const tablesRes = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_cf_KV' ORDER BY name"
  );
  const dump: { exportedAt: string; tables: Record<string, any[]> } = {
    exportedAt: new Date().toISOString(),
    tables: {},
  };
  let totalRows = 0;
  for (const t of tablesRes.rows as any[]) {
    const name = String(t.name);
    const rows = await db.execute(`SELECT * FROM "${name}"`);
    dump.tables[name] = rows.rows;
    totalRows += rows.rows.length;
  }

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const objectKey = `daily/qrmenu-db-${date}.json`;
  await bucket.put(objectKey, JSON.stringify(dump), {
    httpMetadata: { contentType: 'application/json' },
  });

  // ── 2) Temizlik (süpürme) ──
  const now = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let swept = 0;
  const sweep = async (sql: string, args: any[] = []) => {
    try { const r = await db.execute({ sql, args }); swept += r.rowsAffected || 0; } catch { /* tablo yoksa geç */ }
  };
  await sweep('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
  await sweep('DELETE FROM randevu_member_sessions WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
  await sweep('DELETE FROM randevu_admin_sessions WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
  await sweep('DELETE FROM randevu_password_resets WHERE used = 1 OR (expires_at IS NOT NULL AND expires_at < ?)', [now]);
  await sweep('DELETE FROM login_attempts WHERE attempted_at < ?', [dayAgo]);

  return NextResponse.json({
    ok: true,
    backup: objectKey,
    tables: Object.keys(dump.tables).length,
    rows: totalRows,
    sweptRows: swept,
  });
}
