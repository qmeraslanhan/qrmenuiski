const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
let adminToken = null;

// token → { userId, username, facilityIds: Set<number> }
const userTokens = new Map();

function loginAdmin(password) {
  if (password !== ADMIN_PASSWORD) return null;
  adminToken = crypto.randomBytes(32).toString('hex');
  return { token: adminToken, role: 'admin' };
}

function loginUser(username, password, db) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) return null;

  // Lazy migration: bcrypt hash mi düz metin mi?
  const isHashed = user.password.startsWith('$2');
  const match = isHashed
    ? bcrypt.compareSync(password, user.password)
    : password === user.password;
  if (!match) return null;

  // Düz metin şifreyse bcrypt'e yükselt
  if (!isHashed) {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const rows = db.prepare('SELECT facility_id FROM user_facilities WHERE user_id = ?').all(user.id);
  userTokens.set(token, {
    userId: user.id,
    username: user.username,
    facilityIds: new Set(rows.map(r => r.facility_id)),
  });
  return { token, role: 'user' };
}

function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (adminToken && token === adminToken) {
    req.auth = { role: 'admin' };
    return next();
  }
  if (userTokens.has(token)) {
    req.auth = { role: 'user', ...userTokens.get(token) };
    return next();
  }
  return res.status(401).json({ error: 'Yetkisiz erişim' });
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gereklidir' });
  }
  next();
}

function isAdmin(req) { return req.auth?.role === 'admin'; }

function canAccessFacility(req, facilityId) {
  if (req.auth?.role === 'admin') return true;
  return req.auth?.facilityIds?.has(Number(facilityId)) ?? false;
}

// Kullanıcı yetkilerini token üzerinde güncelle (yetki değişince çağrılır)
function refreshUserFacilities(userId, facilityIds) {
  for (const [token, info] of userTokens) {
    if (info.userId === userId) {
      info.facilityIds = new Set(facilityIds);
    }
  }
}

module.exports = { loginAdmin, loginUser, requireAuth, requireAdmin, isAdmin, canAccessFacility, refreshUserFacilities };
