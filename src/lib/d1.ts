// ─────────────────────────────────────────────────────────────────
// Generic D1 wrapper — proje-agnostik.
// Tüm projelerin paylaştığı libsql-uyumlu sorgu arayüzü.
// Proje-spesifik şemalar src/projects/<slug>/db-schema.ts altında.
// ─────────────────────────────────────────────────────────────────
import { getCloudflareContext } from '@opennextjs/cloudflare';

type D1Result = { results?: any[]; success: boolean; meta: { changes: number; last_row_id: number } };
type D1Statement = { bind(...args: any[]): D1Statement; all(): Promise<D1Result>; run(): Promise<D1Result>; first(): Promise<any> };
export type D1Database = {
  prepare(sql: string): D1Statement;
  batch(stmts: D1Statement[]): Promise<D1Result[]>;
  exec(sql: string): Promise<{ count: number; duration: number }>;
};

export function getDB(): D1Database {
  const ctx = getCloudflareContext();
  const d1 = (ctx.env as any).DB as D1Database | undefined;
  if (!d1) throw new Error('D1 binding "DB" bulunamadı — wrangler.toml kontrol et');
  return d1;
}

// libsql-uyumlu execute (mevcut route kodları aynı arayüzü kullanır)
type ExecInput = string | { sql: string; args?: any[] };
type ExecResult = { rows: any[]; rowsAffected: number; lastInsertRowid: number };

async function exec(input: ExecInput): Promise<ExecResult> {
  const d1 = getDB();
  const sql = typeof input === 'string' ? input : input.sql;
  const args = typeof input === 'string' ? [] : (input.args ?? []);
  const stmt = args.length ? d1.prepare(sql).bind(...args) : d1.prepare(sql);

  // WITH ile başlayan CTE'ler yazma da yapabilir (WITH ... DELETE/UPDATE/INSERT);
  // bu durumda .run() gerekir. Sadece yazma anahtar kelimesi içermeyen WITH'i okuma say.
  const head = sql.trimStart().toLowerCase();
  const isRead =
    head.startsWith('select') ||
    head.startsWith('pragma') ||
    (head.startsWith('with') && !/\b(insert|update|delete)\b/i.test(sql));
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
  const cleaned = sql
    .split('\n')
    .filter(l => !/^\s*--/.test(l))
    .join('\n')
    .trim();
  if (!cleaned) return;
  try {
    await d1.exec(cleaned.replace(/\s+/g, ' '));
  } catch (e: any) {
    const stmts = cleaned.split(';').map(s => s.trim()).filter(Boolean);
    if (stmts.length === 1) throw e;
    for (const s of stmts) {
      await d1.prepare(s).run();
    }
  }
}

export const db = {
  execute: exec,
  executeMultiple,
};

export const isUniqueError = (e: any): boolean =>
  /UNIQUE constraint/i.test(e?.message || '') ||
  /D1_ERROR.*unique/i.test(e?.message || '');

// Yardımcı: bir SQL listesini idempotent şekilde uygula (her proje kendi şeması için kullanır)
export async function applySchema(statements: string[]): Promise<void> {
  const d1 = getDB();
  for (const s of statements) {
    try { await d1.prepare(s).run(); } catch (e: any) {
      console.warn('applySchema:', e?.message);
    }
  }
}
