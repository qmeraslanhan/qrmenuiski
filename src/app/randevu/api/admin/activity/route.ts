import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';

// İşlem kaydı (audit log) — üye/operatör/admin tüm hareketleri
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const g = await guard(req, 'viewer');
  if ('res' in g) return g.res;

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || '').trim();   // member | operator | admin
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 200));

  const where: string[] = [];
  const args: any[] = [];
  if (['member', 'operator', 'admin', 'system'].includes(type)) { where.push('actor_type = ?'); args.push(type); }
  if (q) { where.push('(actor_name LIKE ? OR detail LIKE ? OR action LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  args.push(limit);

  const r = await db.execute({
    sql: `SELECT id, actor_type, actor_id, actor_name, action, entity, entity_id, detail, created_at
            FROM randevu_activity_log ${wsql}
           ORDER BY id DESC LIMIT ?`,
    args,
  });
  return NextResponse.json(r.rows);
}
