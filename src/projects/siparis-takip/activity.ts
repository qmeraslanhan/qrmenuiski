// ─────────────────────────────────────────────────────────────────
// İşlem kaydı (audit log) — kim ne yaptı. Tüm önemli mutasyonlar buraya
// yazılır; yönetici "İşlem Kayıtları" ekranından izler.
// Kayıt asla isteği bozmamalı → hatalar yutulur.
// ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/d1';
import type { AuthCtx } from './auth';

export async function logActivity(
  actor: AuthCtx,
  action: string,
  entity: string | null,
  entityId: number | string | null,
  detail: string
): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO siparis_takip_activity_log (actor_type, actor_id, actor_name, action, entity, entity_id, detail)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        actor.super ? 'super' : actor.rol,
        actor.id ?? null,
        actor.ad ?? null,
        action,
        entity,
        entityId != null ? Number(entityId) : null,
        detail,
      ],
    });
  } catch { /* log kaydı isteği bozmaz */ }
}

export async function getActivity(limit = 100) {
  const r = await db.execute({
    sql: `SELECT id, actor_type, actor_id, actor_name, action, entity, entity_id, detail, created_at
          FROM siparis_takip_activity_log ORDER BY id DESC LIMIT ?`,
    args: [limit],
  });
  return (r.rows as any[]).map((a) => ({
    id: Number(a.id), actorType: a.actor_type, actorName: a.actor_name || '—',
    action: a.action, entity: a.entity, entityId: a.entity_id != null ? Number(a.entity_id) : null,
    detail: a.detail || '', createdAt: a.created_at,
  }));
}
