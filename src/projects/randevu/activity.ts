// ─────────────────────────────────────────────────────────────────
// İşlem kaydı (audit log). Üye / operatör / admin tarafındaki tüm
// önemli mutasyonlar buraya yazılır; admin panelinden izlenir.
// Kayıt asla isteği bozmamalı → hatalar yutulur.
// ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/d1';

export type Actor = {
  type: 'member' | 'operator' | 'admin' | 'system';
  id?: number | null;
  name?: string | null;
};

export async function logActivity(
  actor: Actor,
  action: string,
  entity: string | null,
  entityId: number | string | null,
  detail: string
): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO randevu_activity_log (actor_type, actor_id, actor_name, action, entity, entity_id, detail)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        actor.type,
        actor.id ?? null,
        actor.name ?? null,
        action,
        entity,
        entityId != null ? Number(entityId) : null,
        detail,
      ],
    });
  } catch { /* log kaydı isteği bozmaz */ }
}
