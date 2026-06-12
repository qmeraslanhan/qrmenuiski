// ─────────────────────────────────────────────────────────────────
// QR Menü — işlem kaydı (audit log). Kim (admin / kullanıcı adı),
// ne yaptı (action), hangi kayıt (entity + id), ne zaman.
// logActivity hata fırlatmaz: log yazılamasa bile asıl işlem bozulmaz.
// ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/db';
import type { Auth } from '@/lib/auth';

export async function logRaw(
  role: string, name: string, action: string,
  entity?: string | null, entityId?: number | string | null, detail?: string | null
): Promise<void> {
  try {
    await db.execute({
      sql: 'INSERT INTO activity_log (actor_role, actor_name, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)',
      args: [role, name, action, entity ?? null, entityId != null ? Number(entityId) : null, detail ?? null],
    });
  } catch (e: any) {
    console.warn('logActivity:', e?.message);
  }
}

export async function logActivity(
  auth: Auth, action: string,
  entity?: string | null, entityId?: number | string | null, detail?: string | null
): Promise<void> {
  const name = auth.role === 'admin' ? 'Yönetici' : auth.username;
  await logRaw(auth.role, name, action, entity, entityId, detail);
}

export async function getActivity(limit = 200) {
  const r = await db.execute({
    sql: 'SELECT * FROM activity_log ORDER BY id DESC LIMIT ?',
    args: [Math.min(Math.max(1, limit), 500)],
  });
  return (r.rows as any[]).map((a) => ({
    id: Number(a.id),
    actorRole: a.actor_role,
    actorName: a.actor_name || '',
    action: a.action,
    entity: a.entity || '',
    entityId: a.entity_id != null ? Number(a.entity_id) : null,
    detail: a.detail || '',
    createdAt: a.created_at,
  }));
}
