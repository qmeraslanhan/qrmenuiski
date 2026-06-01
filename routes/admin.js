const express = require('express');
const router = express.Router();
const { Readable } = require('stream');
const multer = require('multer');
const QRCode = require('qrcode');
const slugify = require('slugify');
const bcrypt = require('bcryptjs');
const { v2: cloudinary } = require('cloudinary');
const { db } = require('../database/db');
const {
  loginAdmin, loginUser, requireAuth, requireAdmin,
  isAdmin, canAccessFacility, refreshUserFacilities,
} = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Sadece resim dosyaları kabul edilir'));
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'qr-menu', resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    );
    Readable.from(buffer).pipe(stream);
  });
}

const isUniqueError = (e) =>
  e?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint/i.test(e?.message || '');

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Admin girişi: kullanıcı adı yoksa veya boşsa
    if (!username || username.trim() === '') {
      const result = await loginAdmin(password);
      if (!result) return res.status(401).json({ error: 'Hatalı şifre' });
      return res.json(result);
    }

    // Kullanıcı girişi
    const result = await loginUser(username, password);
    if (!result) return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
    res.json(result);
  } catch (e) { next(e); }
});

// ── Facilities ────────────────────────────────────────────────────────────────
router.get('/facilities', requireAuth, async (req, res, next) => {
  try {
    if (isAdmin(req)) {
      const r = await db.execute('SELECT * FROM facilities ORDER BY created_at DESC');
      return res.json(r.rows);
    }
    const ids = [...req.auth.facilityIds];
    if (!ids.length) return res.json([]);
    const placeholders = ids.map(() => '?').join(',');
    const r = await db.execute({
      sql: `SELECT * FROM facilities WHERE id IN (${placeholders}) ORDER BY name`,
      args: ids,
    });
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.post('/facilities', requireAuth, requireAdmin, upload.single('logo'), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Tesis adı zorunludur' });

    const slug = slugify(name, { lower: true, strict: true, locale: 'tr' });
    const logo_url = req.file ? await uploadToCloudinary(req.file.buffer) : null;
    const theme_color = req.body.theme_color || null;

    try {
      const info = await db.execute({
        sql: 'INSERT INTO facilities (name, slug, description, logo_url, theme_color) VALUES (?, ?, ?, ?, ?)',
        args: [name, slug, req.body.description?.trim() || null, logo_url, theme_color],
      });

      const facilityResult = await db.execute({
        sql: 'SELECT * FROM facilities WHERE id = ?',
        args: [info.lastInsertRowid],
      });
      const facility = facilityResult.rows[0];

      const menuUrl = `${req.protocol}://${req.get('host')}/menu/${slug}`;
      const qrCode = await QRCode.toDataURL(menuUrl, { width: 300, margin: 2 });

      res.status(201).json({ ...facility, qrCode, menuUrl });
    } catch (err) {
      if (isUniqueError(err)) {
        return res.status(409).json({ error: 'Bu isimde bir tesis zaten mevcut' });
      }
      throw err;
    }
  } catch (e) { next(e); }
});

router.put('/facilities/:id', requireAuth, upload.single('logo'), async (req, res, next) => {
  try {
    if (!canAccessFacility(req, req.params.id)) {
      return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
    }
    const fr = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [req.params.id] });
    const f = fr.rows[0];
    if (!f) return res.status(404).json({ error: 'Tesis bulunamadı' });

    const name = req.body.name?.trim() || f.name;
    const slug = req.body.name?.trim()
      ? slugify(req.body.name.trim(), { lower: true, strict: true, locale: 'tr' })
      : f.slug;
    const logo_url = req.file
      ? await uploadToCloudinary(req.file.buffer)
      : (req.body.remove_logo === 'true' || req.body.remove_logo === true ? null : f.logo_url);
    const theme_color = req.body.theme_color !== undefined ? (req.body.theme_color || null) : f.theme_color;

    await db.execute({
      sql: 'UPDATE facilities SET name=?, slug=?, description=?, logo_url=?, theme_color=? WHERE id=?',
      args: [
        name, slug,
        req.body.description?.trim() ?? f.description,
        logo_url, theme_color, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/facilities/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const info = await db.execute({ sql: 'DELETE FROM facilities WHERE id = ?', args: [req.params.id] });
    if (!info.rowsAffected) return res.status(404).json({ error: 'Tesis bulunamadı' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.get('/facilities/:id/qr', requireAuth, async (req, res, next) => {
  try {
    if (!canAccessFacility(req, req.params.id)) {
      return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
    }
    const fr = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [req.params.id] });
    const f = fr.rows[0];
    if (!f) return res.status(404).json({ error: 'Tesis bulunamadı' });
    const menuUrl = `${req.protocol}://${req.get('host')}/menu/${f.slug}`;
    const qrCode = await QRCode.toDataURL(menuUrl, { width: 300, margin: 2 });
    res.json({ qrCode, menuUrl });
  } catch (e) { next(e); }
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/facilities/:fid/categories', requireAuth, async (req, res, next) => {
  try {
    if (!canAccessFacility(req, req.params.fid)) {
      return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
    }
    const r = await db.execute({
      sql: 'SELECT * FROM categories WHERE facility_id=? ORDER BY sort_order, id',
      args: [req.params.fid],
    });
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.post('/facilities/:fid/categories', requireAuth, async (req, res, next) => {
  try {
    if (!canAccessFacility(req, req.params.fid)) {
      return res.status(403).json({ error: 'Bu tesise erişim yetkiniz yok' });
    }
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Kategori adı zorunludur' });
    const info = await db.execute({
      sql: 'INSERT INTO categories (facility_id, name, sort_order) VALUES (?, ?, ?)',
      args: [req.params.fid, name, parseInt(req.body.sort_order) || 0],
    });
    const r = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [info.lastInsertRowid] });
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.put('/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const cr = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [req.params.id] });
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ error: 'Kategori bulunamadı' });
    if (!canAccessFacility(req, c.facility_id)) {
      return res.status(403).json({ error: 'Bu kategoriye erişim yetkiniz yok' });
    }
    await db.execute({
      sql: 'UPDATE categories SET name=?, sort_order=? WHERE id=?',
      args: [
        req.body.name?.trim() || c.name,
        req.body.sort_order !== undefined ? parseInt(req.body.sort_order) : c.sort_order,
        req.params.id,
      ],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const cr = await db.execute({ sql: 'SELECT * FROM categories WHERE id=?', args: [req.params.id] });
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ error: 'Kategori bulunamadı' });
    if (!canAccessFacility(req, c.facility_id)) {
      return res.status(403).json({ error: 'Bu kategoriye erişim yetkiniz yok' });
    }
    await db.execute({ sql: 'DELETE FROM categories WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Products ──────────────────────────────────────────────────────────────────
router.get('/categories/:cid/products', requireAuth, async (req, res, next) => {
  try {
    const r = await db.execute({
      sql: 'SELECT * FROM products WHERE category_id=? ORDER BY sort_order, id',
      args: [req.params.cid],
    });
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.post('/categories/:cid/products', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Ürün adı zorunludur' });
    const image_url = req.file ? await uploadToCloudinary(req.file.buffer) : null;
    const info = await db.execute({
      sql: 'INSERT INTO products (category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)',
      args: [
        req.params.cid, name,
        req.body.description?.trim() || null,
        parseFloat(req.body.price) || 0,
        image_url,
      ],
    });
    const r = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [info.lastInsertRowid] });
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.put('/products/:id', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const pr = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [req.params.id] });
    const p = pr.rows[0];
    if (!p) return res.status(404).json({ error: 'Ürün bulunamadı' });
    const image_url = req.file
      ? await uploadToCloudinary(req.file.buffer)
      : (req.body.image_url !== undefined ? req.body.image_url : p.image_url);
    await db.execute({
      sql: 'UPDATE products SET name=?, description=?, price=?, image_url=?, is_active=?, sort_order=? WHERE id=?',
      args: [
        req.body.name?.trim() || p.name,
        req.body.description?.trim() ?? p.description,
        req.body.price !== undefined ? parseFloat(req.body.price) : p.price,
        image_url,
        req.body.is_active !== undefined ? parseInt(req.body.is_active) : p.is_active,
        req.body.sort_order !== undefined ? parseInt(req.body.sort_order) : (p.sort_order || 0),
        req.params.id,
      ],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM products WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/products/:id', requireAuth, async (req, res, next) => {
  try {
    const info = await db.execute({ sql: 'DELETE FROM products WHERE id=?', args: [req.params.id] });
    if (!info.rowsAffected) return res.status(404).json({ error: 'Ürün bulunamadı' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Users (yalnızca admin) ───────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const usersResult = await db.execute('SELECT id, username, created_at FROM users ORDER BY id');
    const users = usersResult.rows;
    for (const u of users) {
      const fr = await db.execute({
        sql: `SELECT f.id, f.name FROM user_facilities uf
              JOIN facilities f ON f.id = uf.facility_id
              WHERE uf.user_id = ? ORDER BY f.name`,
        args: [u.id],
      });
      u.facilities = fr.rows;
    }
    res.json(users);
  } catch (e) { next(e); }
});

router.post('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur' });
    }
    try {
      const hashed = bcrypt.hashSync(password, 10);
      const info = await db.execute({
        sql: 'INSERT INTO users (username, password) VALUES (?, ?)',
        args: [username, hashed],
      });
      res.status(201).json({ id: Number(info.lastInsertRowid), username, facilities: [] });
    } catch (e) {
      if (isUniqueError(e)) {
        return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanımda' });
      }
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const info = await db.execute({ sql: 'DELETE FROM users WHERE id=?', args: [req.params.id] });
    if (!info.rowsAffected) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Kullanıcının tesis yetkilerini toplu güncelle
router.put('/users/:id/facilities', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const userResult = await db.execute({ sql: 'SELECT id FROM users WHERE id=?', args: [userId] });
    if (!userResult.rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const facilityIds = (req.body.facilityIds || []).map(Number).filter(Boolean);
    await db.execute({ sql: 'DELETE FROM user_facilities WHERE user_id=?', args: [userId] });
    for (const fid of facilityIds) {
      await db.execute({
        sql: 'INSERT INTO user_facilities (user_id, facility_id) VALUES (?, ?)',
        args: [userId, fid],
      });
    }

    await refreshUserFacilities(userId, facilityIds);
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
