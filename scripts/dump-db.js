// One-shot: Turso'dan indirilen qr-menu.db dosyasını D1'a importlanabilir
// formatda SQL dump'a çevirir. Çıktı: scripts/turso-dump.sql
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, '..', 'qr-menu.db');
const OUT_FILE = path.join(__dirname, 'turso-dump.sql');

function escape(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

(async () => {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_FILE);
  const db = new SQL.Database(buf);

  const lines = [];
  lines.push('-- Turso → D1 migration dump');
  lines.push('-- Source: qr-menu.db');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push('PRAGMA foreign_keys = OFF;');
  lines.push('');

  // Tabloları çek (sqlite_ ile başlayanları atla)
  const tables = db.exec(`
    SELECT name, sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'
    ORDER BY name
  `);

  if (!tables.length) {
    console.log('No user tables found.');
    process.exit(1);
  }

  const rows = tables[0].values;
  // Önce şema, sonra veri — ama D1 zaten ensureInit ile tablo yaratacak.
  // Migration için sadece DATA satırlarını üretelim, tablolar uygulamada oluşturulacak.

  for (const [tableName] of rows) {
    const r = db.exec(`SELECT * FROM "${tableName}"`);
    if (!r.length) {
      lines.push(`-- ${tableName}: empty`);
      lines.push('');
      continue;
    }
    const cols = r[0].columns;
    const data = r[0].values;
    lines.push(`-- ${tableName}: ${data.length} rows`);
    const colList = cols.map(c => `"${c}"`).join(', ');
    for (const row of data) {
      const vals = row.map(escape).join(', ');
      lines.push(`INSERT INTO "${tableName}" (${colList}) VALUES (${vals});`);
    }
    lines.push('');
  }

  fs.writeFileSync(OUT_FILE, lines.join('\n'));
  console.log(`Dump yazıldı: ${OUT_FILE}`);
  console.log(`Toplam tablo: ${rows.length}`);
})();
