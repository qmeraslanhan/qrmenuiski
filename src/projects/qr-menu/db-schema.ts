// ─────────────────────────────────────────────────────────────────
// QR Menü projesi — D1 tablo şeması.
// İlk istek geldiğinde ensureInit() tabloları idempotent yaratır.
// Yeni kolon eklerken: aşağıdaki listeye ALTER TABLE eklemek yerine
// applySchema'ya yeni statement ekle veya safeAddColumn pattern kullan.
// ─────────────────────────────────────────────────────────────────
import { applySchema } from '@/lib/d1';

let initialized = false;

export async function ensureInit(): Promise<void> {
  if (initialized) return;
  await applySchema([
    `CREATE TABLE IF NOT EXISTS facilities (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      slug        TEXT    NOT NULL UNIQUE,
      description TEXT,
      logo_url    TEXT,
      theme_color TEXT    DEFAULT NULL,
      phone       TEXT,
      hours_text  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      sort_order  INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      description TEXT,
      price       REAL    NOT NULL DEFAULT 0,
      image_url   TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      sort_order  INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      username       TEXT    NOT NULL UNIQUE,
      password       TEXT    NOT NULL,
      can_create_fac INTEGER NOT NULL DEFAULT 0,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_facilities (
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, facility_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      role       TEXT    NOT NULL,
      user_id    INTEGER,
      username   TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS session_facilities (
      token       TEXT    NOT NULL REFERENCES sessions(token) ON DELETE CASCADE,
      facility_id INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
      ip           TEXT    NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    // Mevcut DB'ye idempotent kolon ekle (kolon zaten varsa applySchema hatayı yutar)
    `ALTER TABLE users ADD COLUMN can_create_fac INTEGER NOT NULL DEFAULT 0`,
    `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at)`,
    // FK / sık sorgu kolonları — join'lerde tam tarama yerine index
    `CREATE INDEX IF NOT EXISTS idx_categories_facility ON categories(facility_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_facilities_token ON session_facilities(token)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
  ]);
  initialized = true;
}
