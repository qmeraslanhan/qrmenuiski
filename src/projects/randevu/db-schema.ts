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
      break_start  TEXT,
      break_end    TEXT,
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
      photo_url  TEXT,
      is_active  INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_staff_salon ON randevu_staff(salon_id)`,

    // Kapalı günler / tatiller (salon bazında belirli tarihler)
    `CREATE TABLE IF NOT EXISTS randevu_closures (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id   INTEGER NOT NULL REFERENCES randevu_salons(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      reason     TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_closures ON randevu_closures(salon_id, date)`,

    // Üyeler (randevu alabilmek için kayıt zorunlu)
    `CREATE TABLE IF NOT EXISTS randevu_members (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      email            TEXT    NOT NULL UNIQUE,
      phone            TEXT    NOT NULL,
      password         TEXT    NOT NULL,
      kvkk_accepted_at DATETIME,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS randevu_member_sessions (
      token      TEXT    PRIMARY KEY,
      member_id  INTEGER NOT NULL REFERENCES randevu_members(id) ON DELETE CASCADE,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS randevu_password_resets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id  INTEGER NOT NULL REFERENCES randevu_members(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL UNIQUE,
      expires_at DATETIME,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_pwreset_token ON randevu_password_resets(token)`,

    // Salon operatörleri — admin bir üyeyi salona atar; o üye o salonun
    // günlük randevularını görüp yönetebilir (kendi salonuyla sınırlı).
    `CREATE TABLE IF NOT EXISTS randevu_salon_operators (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id   INTEGER NOT NULL REFERENCES randevu_salons(id) ON DELETE CASCADE,
      member_id  INTEGER NOT NULL REFERENCES randevu_members(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(salon_id, member_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_operators_member ON randevu_salon_operators(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_operators_salon ON randevu_salon_operators(salon_id)`,

    // Randevular
    `CREATE TABLE IF NOT EXISTS randevu_appointments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_id      INTEGER NOT NULL,
      service_id    INTEGER,
      service_name  TEXT,
      duration_min  INTEGER NOT NULL DEFAULT 30,
      staff_id      INTEGER,
      member_id     INTEGER,
      customer_name TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      email         TEXT,
      date          TEXT    NOT NULL,
      time          TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'pending',
      code          TEXT,
      note          TEXT,
      decided_note  TEXT,
      decided_at    DATETIME,
      reminder_sent INTEGER NOT NULL DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    // Mevcut (eski) tablolar için kolonları idempotent ekle (yeni DB'de hata verir → applySchema yutar)
    `ALTER TABLE randevu_appointments ADD COLUMN member_id INTEGER`,
    `ALTER TABLE randevu_appointments ADD COLUMN email TEXT`,
    `ALTER TABLE randevu_appointments ADD COLUMN code TEXT`,
    `ALTER TABLE randevu_appointments ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE randevu_salons ADD COLUMN break_start TEXT`,
    `ALTER TABLE randevu_salons ADD COLUMN break_end TEXT`,
    `ALTER TABLE randevu_staff ADD COLUMN photo_url TEXT`,
    `ALTER TABLE randevu_members ADD COLUMN kvkk_accepted_at DATETIME`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_appt_day ON randevu_appointments(salon_id, date, status)`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_appt_staff ON randevu_appointments(staff_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_appt_member ON randevu_appointments(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_randevu_appt_reminder ON randevu_appointments(date, status, reminder_sent)`,

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
