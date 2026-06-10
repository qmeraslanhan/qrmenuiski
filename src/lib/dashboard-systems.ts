// ─────────────────────────────────────────────────────────────────
// Portal dashboard — sistemlerin durumu + içerik/sıra override'ları +
// portal genel ayarları (başlık/açıklama/footer/vurgu rengi).
//
// Kural: tablolar yalnızca override edilen değerleri tutar. Boş/yok =
// meta.ts varsayılanı kullanılır. Yeni projeler otomatik aktif + varsayılan.
// ─────────────────────────────────────────────────────────────────
import { db } from './d1';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS dashboard_systems (
    slug       TEXT PRIMARY KEY,
    is_active  INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  // İçerik + sıra override kolonları (idempotent; varsa hata yutulur)
  `ALTER TABLE dashboard_systems ADD COLUMN title TEXT`,
  `ALTER TABLE dashboard_systems ADD COLUMN description TEXT`,
  `ALTER TABLE dashboard_systems ADD COLUMN tags TEXT`,
  `ALTER TABLE dashboard_systems ADD COLUMN status TEXT`,
  `ALTER TABLE dashboard_systems ADD COLUMN sort_order INTEGER`,
  // Portal genel ayarları (key/value)
  `CREATE TABLE IF NOT EXISTS dashboard_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  )`,
];

let ensured = false;
export async function ensureDashboardSchema(): Promise<void> {
  if (ensured) return;
  for (const sql of STATEMENTS) {
    try { await db.execute(sql); } catch { /* kolon/tablo zaten var */ }
  }
  ensured = true;
}

// ── Portal ayarları ──
export type DashboardSettings = {
  portal_label: string;
  portal_title: string;
  portal_title_accent: string;
  portal_subtitle: string;
  footer_text: string;
  accent_color: string;
};

export const DEFAULT_SETTINGS: DashboardSettings = {
  portal_label: 'İSKİ Kültür ve Sosyal İşler Şube Müdürlüğü',
  portal_title: 'Dijital Hizmetler',
  portal_title_accent: 'Portalı',
  portal_subtitle:
    'Şube müdürlüğümüz bünyesindeki tesisler ve operasyonel sistemler için merkezi erişim noktası.',
  footer_text: 'İSKİ Kültür ve Sosyal İşler Şube Müdürlüğü',
  accent_color: '#0F4C81',
};

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const VALID_STATUS = ['live', 'beta', 'soon'] as const;

export type ProjectOverride = {
  is_active: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
  sort_order?: number;
};

function parseTags(v: any): string[] | undefined {
  if (!v) return undefined;
  try { const a = JSON.parse(String(v)); return Array.isArray(a) ? a.map(String) : undefined; }
  catch { return undefined; }
}

// Tek seferde: ayarlar + tüm proje override'ları
export async function getDashboardData(): Promise<{
  settings: DashboardSettings;
  overrides: Record<string, ProjectOverride>;
}> {
  try {
    await ensureDashboardSchema();
    const settings: DashboardSettings = { ...DEFAULT_SETTINGS };
    const s = await db.execute('SELECT key, value FROM dashboard_settings');
    for (const row of s.rows as any[]) {
      const k = String(row.key);
      if (k in settings && row.value != null && String(row.value) !== '') {
        (settings as any)[k] = String(row.value);
      }
    }
    if (!HEX_RE.test(settings.accent_color)) settings.accent_color = DEFAULT_SETTINGS.accent_color;

    const r = await db.execute(
      'SELECT slug, is_active, title, description, tags, status, sort_order FROM dashboard_systems'
    );
    const overrides: Record<string, ProjectOverride> = {};
    for (const row of r.rows as any[]) {
      overrides[String(row.slug)] = {
        is_active: Number(row.is_active) === 1,
        title: row.title ? String(row.title) : undefined,
        description: row.description ? String(row.description) : undefined,
        tags: parseTags(row.tags),
        status: VALID_STATUS.includes(row.status) ? String(row.status) : undefined,
        sort_order: row.sort_order != null ? Number(row.sort_order) : undefined,
      };
    }
    return { settings, overrides };
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, overrides: {} };
  }
}

// Sadece aktif/pasif değiştir (hızlı toggle — içerik kolonlarına dokunmaz)
export async function setSystemActive(slug: string, active: boolean): Promise<void> {
  await ensureDashboardSchema();
  await db.execute({
    sql: `INSERT INTO dashboard_systems (slug, is_active, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(slug) DO UPDATE SET is_active = excluded.is_active, updated_at = CURRENT_TIMESTAMP`,
    args: [slug, active ? 1 : 0],
  });
}

const emptyToNull = (v: any): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

export type ProjectContentInput = {
  slug: string;
  is_active?: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
  sort_order?: number;
};

// Ayarları + proje içerik/sıra override'larını kaydet (admin)
export async function saveDashboardContent(
  settings: Partial<DashboardSettings>,
  projects: ProjectContentInput[]
): Promise<void> {
  await ensureDashboardSchema();

  for (const [key, value] of Object.entries(settings)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await db.execute({
      sql: `INSERT INTO dashboard_settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, emptyToNull(value)],
    });
  }

  for (const p of projects) {
    if (!p.slug) continue;
    const status = p.status && VALID_STATUS.includes(p.status as any) ? p.status : null;
    const tags = Array.isArray(p.tags) && p.tags.length ? JSON.stringify(p.tags.map(String)) : null;
    await db.execute({
      sql: `INSERT INTO dashboard_systems (slug, is_active, title, description, tags, status, sort_order, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET
              is_active   = excluded.is_active,
              title       = excluded.title,
              description = excluded.description,
              tags        = excluded.tags,
              status      = excluded.status,
              sort_order  = excluded.sort_order,
              updated_at  = CURRENT_TIMESTAMP`,
      args: [
        p.slug,
        p.is_active === false ? 0 : 1,
        emptyToNull(p.title),
        emptyToNull(p.description),
        tags,
        status,
        p.sort_order ?? null,
      ],
    });
  }
}
