const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'qrmenu.db');
const db = new Database(dbPath);

// Yabancı anahtar kısıtlamalarını etkinleştir (ON DELETE CASCADE için gerekli)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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
`);

// Mevcut DB'ye theme_color ekle (varsa hata yutulur)
try { db.exec('ALTER TABLE facilities ADD COLUMN theme_color TEXT DEFAULT NULL'); } catch (_) {}
try { db.exec('ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (_) {}

module.exports = db;
