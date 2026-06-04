// ─────────────────────────────────────────────────────────────────
// Barrel export — qr-menu route'larına eski API'yi sunar.
//
// Yeni projeler bunun yerine direkt import yapsın:
//   import { db, isUniqueError } from '@/lib/d1';            // generic
//   import { ensureInit }         from '@/projects/<slug>/db-schema';
// ─────────────────────────────────────────────────────────────────
export { db, isUniqueError } from '@/lib/d1';
export { ensureInit } from '@/projects/qr-menu/db-schema';
