// Turso DB içeriğini JSON olarak yedekle: backups/YYYY-MM-DD_HH-MM.json
// Çalıştırma (PowerShell):
//   $env:TURSO_DATABASE_URL = "libsql://..."
//   $env:TURSO_AUTH_TOKEN  = "..."
//   npm run backup

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('HATA: TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN env vars set edilmemiş.');
    process.exit(1);
  }

  const data = {};
  const tables = ['facilities', 'categories', 'products', 'users', 'user_facilities'];
  for (const t of tables) {
    const r = await db.execute(`SELECT * FROM ${t}`);
    data[t] = r.rows;
    console.log(`  ${t.padEnd(18)} ${r.rows.length} satır`);
  }

  const dir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const ts = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const file = path.join(dir, `${ts}.json`);

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  const sizeKb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`\n✓ Yedek alındı: ${file} (${sizeKb} KB)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('HATA:', e); process.exit(1); });
