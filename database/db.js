const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS facilities (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      slug        TEXT    NOT NULL UNIQUE,
      description TEXT,
      logo_url    TEXT,
      theme_color TEXT    DEFAULT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      sort_order  INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      description TEXT,
      price       REAL    NOT NULL DEFAULT 0,
      image_url   TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      sort_order  INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_facilities (
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, facility_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      role       TEXT    NOT NULL,
      user_id    INTEGER,
      username   TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS session_facilities (
      token       TEXT    NOT NULL REFERENCES sessions(token) ON DELETE CASCADE,
      facility_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      ip         TEXT    NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at);
  `);

  // Idempotent column migrations (eski DB'leri yeni şemaya çek)
  await safeAddColumn('sessions',   'expires_at', 'DATETIME');
  await safeAddColumn('facilities', 'phone',      'TEXT');
  await safeAddColumn('facilities', 'hours_text', 'TEXT');

  initialized = true;
}

async function safeAddColumn(table, column, type) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (e) {
    // Kolon zaten var → atla. Başka hata varsa logla.
    if (!/duplicate column|already exists/i.test(e.message || '')) {
      console.warn(`safeAddColumn ${table}.${column}:`, e.message);
    }
  }
}

module.exports = { db, ensureInit };
