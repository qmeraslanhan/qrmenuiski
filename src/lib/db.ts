import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cloudflare D1 binding (wrangler.toml içinde "DB" olarak tanımlı)
type D1Result = { results?: any[]; success: boolean; meta: { changes: number; last_row_id: number } };
type D1Statement = { bind(...args: any[]): D1Statement; all(): Promise<D1Result>; run(): Promise<D1Result>; first(): Promise<any> };
type D1Database = {
  prepare(sql: string): D1Statement;
  batch(stmts: D1Statement[]): Promise<D1Result[]>;
  exec(sql: string): Promise<{ count: number; duration: number }>;
};

function getDB(): D1Database {
  const ctx = getCloudflareContext();
  const d1 = (ctx.env as any).DB as D1Database | undefined;
  if (!d1) throw new Error('D1 binding "DB" bulunamadı — wrangler.toml kontrol et');
  return d1;
}

// libsql-uyumlu execute fonksiyonu
type ExecInput = string | { sql: string; args?: any[] };
type ExecResult = { rows: any[]; rowsAffected: number; lastInsertRowid: number };

async function exec(input: ExecInput): Promise<ExecResult> {
  const d1 = getDB();
  const sql = typeof input === 'string' ? input : input.sql;
  const args = typeof input === 'string' ? [] : (input.args ?? []);
  const stmt = args.length ? d1.prepare(sql).bind(...args) : d1.prepare(sql);

  const isRead = /^\s*(select|with|pragma)/i.test(sql);
  if (isRead) {
    const r = await stmt.all();
    return { rows: r.results ?? [], rowsAffected: 0, lastInsertRowid: 0 };
  }
  const r = await stmt.run();
  return {
    rows: [],
    rowsAffected: r.meta?.changes ?? 0,
    lastInsertRowid: r.meta?.last_row_id ?? 0,
  };
}

async function executeMultiple(sql: string): Promise<void> {
  const d1 = getDB();
  // exec() noktalı virgülle ayrılmış birden fazla statement'ı çalıştırır
  const cleaned = sql
    .split('\n')
    .filter(l => !/^\s*--/.test(l))
    .join('\n')
    .trim();
  if (!cleaned) return;
  try {
    await d1.exec(cleaned.replace(/\s+/g, ' '));
  } catch (e: any) {
    // D1.exec çok hassas; tek tek dene
    const stmts = cleaned.split(';').map(s => s.trim()).filter(Boolean);
    if (stmts.length === 1) throw e;
    for (const s of stmts) {
      await d1.prepare(s).run();
    }
  }
}

// libsql-uyumlu db nesnesi (mevcut route kodları değişmeden çalışsın)
export const db = {
  execute: exec,
  executeMultiple,
};

// ───── Migration / init ─────
let initialized = false;
export async function ensureInit(): Promise<void> {
  if (initialized) return;
  const stmts = [
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
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at)`,
  ];

  const d1 = getDB();
  for (const s of stmts) {
    try { await d1.prepare(s).run(); } catch (e: any) {
      console.warn('ensureInit:', e?.message);
    }
  }
  initialized = true;
}

export const isUniqueError = (e: any): boolean =>
  /UNIQUE constraint/i.test(e?.message || '') ||
  /D1_ERROR.*unique/i.test(e?.message || '');
