const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const slugify = require('slugify');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const {
  loginAdmin, loginUser, requireAuth, requireAdmin,
  isAdmin, canAccessFacility, refreshUserFacilities,
} = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Sadece resim dosyaları kabul edilir'));
  },
});

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Admin girişi: kullanıcı adı yoksa veya boşsa
  if (!username || username.trim() === '') {
    const result = loginAdmin(password);
    if (!result) return res.status(401).json({ error: 'Hatalı şifre' });
    return res.json(result);
  }

  // Kullanıcı girişi
  const result = loginUser(username, password, db);
  if (!result) return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
  res.json(result);
});

// ── Facilities ────────────────────────────────────────────────────────────────
router.get('/facilities', requireAuth, (req, res) => {
  if (isAdmin(req)) {
    return res.json(db.prepare('SELECT * FROM facilities ORDER BY created_at DESC').all());
  }
  // Kullanıcı: sadece yetkili tesisler
  const ids = [...req.auth.facilityIds];
  if (!ids.length) return res.json([]);
  const placeholders = ids.map(() => '?').join(',');
  res.json(
    db.prepare(`SELECT * FROM facilities WHERE id IN (${placeholders}) ORDER BY name`).all(...ids)
  );
});

router.post('/facilities', requireAuth, requireAdmin, upload.single('logo'), async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Tesis adı zorunludur' });

  const slug = slugify(name, { lower: true, strict: true, locale: 'tr' });
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const theme_color = req.body.theme_color || null;

  try {
    const info = db.prepare(
      'INSERT INTO facilities (name, slug, description, logo_url, theme_color) VALUES (?, ?, ?, ?, ?)'
    ).run(name, slug, req.body.description?.trim() || null, logo_url, theme_color);

    const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(info.lastInsertRowid);
    const menuUrl = `${req.protocol}://${req.get('host')}/menu/${slug}`;
    const qrCode = await QRCode.toDataURL(menuUrl, { width: 300, margin: 2 });

    res.status(201).json({ ...facility, qrCode, menuUrl });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Bu isimde bir tesis zaten mevcut' });
    }
    throw err;
  }
});

router.put('/facilities/:id', requireAuth, upload.single('logo'), (req, res) => {
  if (!canAccessFacility(req, req.params.id)) {
    return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
  }
  const f = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Tesis bulunamadı' });

  const name = req.body.name?.trim() || f.name;
  const slug = req.body.name?.trim()
    ? slugify(req.body.name.trim(), { lower: true, strict: true, locale: 'tr' })
    : f.slug;
  const logo_url = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body.remove_logo === 'true' || req.body.remove_logo === true ? null : f.logo_url);
  const theme_color = req.body.theme_color !== undefined ? (req.body.theme_color || null) : f.theme_color;

  db.prepare('UPDATE facilities SET name=?, slug=?, description=?, logo_url=?, theme_color=? WHERE id=?')
    .run(name, slug, req.body.description?.trim() ?? f.description, logo_url, theme_color, req.params.id);

  res.json(db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id));
});

router.delete('/facilities/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM facilities WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Tesis bulunamadı' });
  res.json({ success: true });
});

router.get('/facilities/:id/qr', requireAuth, async (req, res) => {
  if (!canAccessFacility(req, req.params.id)) {
    return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
  }
  const f = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Tesis bulunamadı' });
  const menuUrl = `${req.protocol}://${req.get('host')}/menu/${f.slug}`;
  const qrCode = await QRCode.toDataURL(menuUrl, { width: 300, margin: 2 });
  res.json({ qrCode, menuUrl });
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/facilities/:fid/categories', requireAuth, (req, res) => {
  if (!canAccessFacility(req, req.params.fid)) {
    return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
  }
  res.json(
    db.prepare('SELECT * FROM categories WHERE facility_id=? ORDER BY sort_order, id').all(req.params.fid)
  );
});

router.post('/facilities/:fid/categories', requireAuth, (req, res) => {
  if (!canAccessFacility(req, req.params.fid)) {
    return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
  }
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Kategori adı zorunludur' });
  const info = db.prepare('INSERT INTO categories (facility_id, name, sort_order) VALUES (?, ?, ?)')
    .run(req.params.fid, name, parseInt(req.body.sort_order) || 0);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id=?').get(info.lastInsertRowid));
});

router.put('/categories/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Kategori bulunamadı' });
  if (!canAccessFacility(req, c.facility_id)) {
    return res.status(403).json({ error: 'Bu kategoriye erişim yetkiniz yok' });
  }
  db.prepare('UPDATE categories SET name=?, sort_order=? WHERE id=?').run(
    req.body.name?.trim() || c.name,
    req.body.sort_order !== undefined ? parseInt(req.body.sort_order) : c.sort_order,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id));
});

router.delete('/categories/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Kategori bulunamadı' });
  if (!canAccessFacility(req, c.facility_id)) {
    return res.status(403).json({ error: 'Bu kategoriye erişim yetkiniz yok' });
  }
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get('/categories/:cid/products', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM products WHERE category_id=? ORDER BY sort_order, id').all(req.params.cid));
});

router.post('/categories/:cid/products', requireAuth, upload.single('image'), (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Ürün adı zorunludur' });
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const info = db.prepare(
    'INSERT INTO products (category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.cid, name, req.body.description?.trim() || null, parseFloat(req.body.price) || 0, image_url);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(info.lastInsertRowid));
});

router.put('/products/:id', requireAuth, upload.single('image'), (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Ürün bulunamadı' });
  const image_url = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body.image_url !== undefined ? req.body.image_url : p.image_url);
  db.prepare('UPDATE products SET name=?, description=?, price=?, image_url=?, is_active=?, sort_order=? WHERE id=?').run(
    req.body.name?.trim() || p.name,
    req.body.description?.trim() ?? p.description,
    req.body.price !== undefined ? parseFloat(req.body.price) : p.price,
    image_url,
    req.body.is_active !== undefined ? parseInt(req.body.is_active) : p.is_active,
    req.body.sort_order !== undefined ? parseInt(req.body.sort_order) : (p.sort_order || 0),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});

router.delete('/products/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json({ success: true });
});

// ── Users (yalnızca admin) ───────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all();
  users.forEach(u => {
    u.facilities = db.prepare(
      `SELECT f.id, f.name FROM user_facilities uf
       JOIN facilities f ON f.id = uf.facility_id
       WHERE uf.user_id = ? ORDER BY f.name`
    ).all(u.id);
  });
  res.json(users);
});

router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur' });
  }
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);
    res.status(201).json({ id: info.lastInsertRowid, username, facilities: [] });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanımda' });
    }
    throw e;
  }
});

router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  res.json({ success: true });
});

// Kullanıcının tesis yetkilerini toplu güncelle
router.put('/users/:id/facilities', requireAuth, requireAdmin, (req, res) => {
  const userId = req.params.id;
  const user = db.prepare('SELECT id FROM users WHERE id=?').get(userId);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const facilityIds = (req.body.facilityIds || []).map(Number).filter(Boolean);
  db.prepare('DELETE FROM user_facilities WHERE user_id=?').run(userId);
  const insert = db.prepare('INSERT INTO user_facilities (user_id, facility_id) VALUES (?, ?)');
  facilityIds.forEach(fid => insert.run(userId, fid));

  refreshUserFacilities(Number(userId), facilityIds);
  res.json({ success: true });
});

module.exports = router;
