const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../database/db');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function loginAdmin(password) {
  if (password !== ADMIN_PASSWORD) return null;
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({ sql: 'INSERT INTO sessions (token, role) VALUES (?, ?)', args: [token, 'admin'] });
  return { token, role: 'admin' };
}

async function loginUser(username, password) {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username.trim()],
  });
  const user = result.rows[0];
  if (!user) return null;

  // Lazy migration: bcrypt hash mi düz metin mi?
  const isHashed = String(user.password).startsWith('$2');
  const match = isHashed
    ? bcrypt.compareSync(password, user.password)
    : password === user.password;
  if (!match) return null;

  // Düz metin şifreyse bcrypt'e yükselt
  if (!isHashed) {
    const hashed = bcrypt.hashSync(password, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashed, user.id],
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const facilities = await db.execute({
    sql: 'SELECT facility_id FROM user_facilities WHERE user_id = ?',
    args: [user.id],
  });
  await db.execute({
    sql: 'INSERT INTO sessions (token, role, user_id, username) VALUES (?, ?, ?, ?)',
    args: [token, 'user', user.id, user.username],
  });
  for (const r of facilities.rows) {
    await db.execute({
      sql: 'INSERT INTO session_facilities (token, facility_id) VALUES (?, ?)',
      args: [token, r.facility_id],
    });
  }
  return { token, role: 'user' };
}

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Yetkisiz erişim' });

    const sessionResult = await db.execute({
      sql: 'SELECT * FROM sessions WHERE token = ?',
      args: [token],
    });
    const session = sessionResult.rows[0];
    if (!session) return res.status(401).json({ error: 'Yetkisiz erişim' });

    if (session.role === 'admin') {
      req.auth = { role: 'admin' };
      return next();
    }

    const facs = await db.execute({
      sql: 'SELECT facility_id FROM session_facilities WHERE token = ?',
      args: [token],
    });
    req.auth = {
      role: 'user',
      userId: Number(session.user_id),
      username: session.username,
      facilityIds: new Set(facs.rows.map(r => Number(r.facility_id))),
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gereklidir' });
  }
  next();
}

function isAdmin(req) {
  return req.auth?.role === 'admin';
}

function canAccessFacility(req, facilityId) {
  if (req.auth?.role === 'admin') return true;
  return req.auth?.facilityIds?.has(Number(facilityId)) ?? false;
}

// Kullanıcı yetkilerini güncelle (admin kullanıcı tesis yetkisi düzenleyince)
async function refreshUserFacilities(userId, facilityIds) {
  const sessions = await db.execute({
    sql: 'SELECT token FROM sessions WHERE user_id = ?',
    args: [userId],
  });
  for (const s of sessions.rows) {
    await db.execute({
      sql: 'DELETE FROM session_facilities WHERE token = ?',
      args: [s.token],
    });
    for (const fid of facilityIds) {
      await db.execute({
        sql: 'INSERT INTO session_facilities (token, facility_id) VALUES (?, ?)',
        args: [s.token, fid],
      });
    }
  }
}

module.exports = {
  loginAdmin, loginUser, requireAuth, requireAdmin,
  isAdmin, canAccessFacility, refreshUserFacilities,
};
