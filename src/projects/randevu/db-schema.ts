// ─────────────────────────────────────────────────────────────────
// Randevu (Berber & Kuaför Randevu) projesi — D1 şeması.
// İlk istek geldiğinde ensureRandevuInit() tabloları idempotent yaratır.
//
// Model: salon → hizmetler + (opsiyonel) usta → gün/saat slotlu randevu.
// Slot uygunluğu salonun çalışma saatleri + slot süresi + mevcut
// randevulardan türetilir (ayrı bir slot tablosu yok).
//
// Tablolar `randevu_` prefix'li (çakışma önleme kuralı). Auth tabloları
// (sessions, login_attempts) qr-menu ile paylaşılır — burada da idempotent
// yaratılır ki bu proje tek başına çalışabilsin.
// ─────────────────────────────────────────────────────────────────
import { applySchema } from '@/lib/d1';

let initialized = false;

export async function ensureRandevuInit(): Promise<void> {
  if (initialized) return;
  await applySchema([
    // Salonlar (berber / kuaför işletmeleri)
    `CREATE TABLE IF NOT EXISTS randevu_salons (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      slug         TEXT    NOT NULL UNIQUE,
      type         TEXT    NOT NULL DEFAULT 'berber',
      description  TEXT,
      address      TEXT,
      phone        TEXT,
      image_url    TEXT,
      open_time    TEXT    NOT NULL DEFAULT '09:00',
      close_time   TEXT    NOT NULL DEFAULT '18:00',
      slot_minutes INTEGER NOT NULL DEFAULT 30,
      work_days    TEXT    NOT NULL DEFAULT '1,2,3,4,5,6',
      is_active    INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Hizmetler (saç kesimi, sakal, boya, fön...) — her birinin süresi + ücreti
    `CREATE TABLE IF NOT EXISTS randevu_services (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id     INTEGER NOT NULL REFERENCES randevu_salons(id) ON DELETE CASCADE,
      name         TEXT    NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 30,
      price        REAL    NOT NULL DEFAULT 0,
      is_active    INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_services_salon ON randevu_services(salon_id)`,

    // Ustalar / personel (opsiyonel — yoksa randevu salon bazında çalışır)
    `CREATE TABLE IF NOT EXISTS randevu_staff (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id   INTEGER NOT NULL REFERENCES randevu_salons(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_staff_salon ON randevu_staff(salon_id)`,

    // Randevular
    `CREATE TABLE IF NOT EXISTS randevu_appointments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id      INTEGER NOT NULL,
      service_id    INTEGER,
      service_name  TEXT,
      duration_min  INTEGER NOT NULL DEFAULT 30,
      staff_id      INTEGER,
      customer_name TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      date          TEXT    NOT NULL,
      time          TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'pending',
      note          TEXT,
      decided_note  TEXT,
      decided_at    DATETIME,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_appt_day ON randevu_appointments(salon_id, date, status)`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_appt_staff ON randevu_appointments(staff_id, date)`,

    // ── Paylaşılan auth tabloları (qr-menu ile ortak; idempotent) ──
    `CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      role       TEXT    NOT NULL,
      user_id    INTEGER,
      username   TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
      ip           TEXT    NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at)`,
  ]);
  initialized = true;
}
