// ─────────────────────────────────────────────────────────────────
// Portal dashboard — sistemlerin anlık aktif/pasif durumu (D1).
//
// Kural: YOKLUK = aktif. Tabloda sadece pasife alınmış / override edilmiş
// sistemler tutulur. Böylece yeni projeler otomatik aktif gelir.
// ─────────────────────────────────────────────────────────────────
import { db } from './d1';

const SCHEMA = `CREATE TABLE IF NOT EXISTS dashboard_systems (
  slug       TEXT PRIMARY KEY,
  is_active  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`;

let ensured = false;
export async function ensureDashboardSchema(): Promise<void> {
  if (ensured) return;
  await db.execute(SCHEMA);
  ensured = true;
}

// slug -> aktif mi? Sadece tabloda kaydı olan sistemler döner.
// Kaydı olmayan = aktif (consumer `!== false` ile değerlendirmeli).
export async function getSystemStatuses(): Promise<Record<string, boolean>> {
  try {
    await ensureDashboardSchema();
    const r = await db.execute('SELECT slug, is_active FROM dashboard_systems');
    const map: Record<string, boolean> = {};
    for (const row of r.rows as any[]) {
      map[String(row.slug)] = Number(row.is_active) === 1;
    }
    return map;
  } catch {
    // Şema/DB hatası → her şeyi aktif say (fail-open).
    return {};
  }
}

export async function setSystemActive(slug: string, active: boolean): Promise<void> {
  await ensureDashboardSchema();
  await db.execute({
    sql: `INSERT INTO dashboard_systems (slug, is_active, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(slug) DO UPDATE SET
            is_active  = excluded.is_active,
            updated_at = CURRENT_TIMESTAMP`,
    args: [slug, active ? 1 : 0],
  });
}
