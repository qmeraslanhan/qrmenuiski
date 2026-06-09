// ─────────────────────────────────────────────────────────────────
// Randevu admin paneli kimlik doğrulama + rol bazlı yetki (RBAC).
// Roller: admin (tam yetki + kullanıcı yönetimi) > editor > viewer.
// Süper yönetici: ADMIN_PASSWORD env ile her zaman girebilir (user_id=null).
// qr-menu'nün paylaşılan sessions tablosundan BAĞIMSIZ kendi oturum tablosu.
// ─────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';

const TTL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Role = 'admin' | 'editor' | 'viewer';
export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };
export const ROLE_LABEL: Record<Role, string> = { viewer: 'Görüntüleyici', editor: 'Editör', admin: 'Yönetici' };

export type AdminCtx = { id: number | null; name: string; email: string | null; role: Role };

function normRole(r: any): Role {
  return r === 'admin' || r === 'editor' || r === 'viewer' ? r : 'editor';
}
function expiresAt(): string {
  const d = new Date(); d.setDate(d.getDate() + TTL_DAYS); return d.toISOString();
}

async function createSession(ctx: AdminCtx): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({
    sql: 'INSERT INTO randevu_admin_sessions (token, user_id, role, name, email, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [token, ctx.id, ctx.role, ctx.name, ctx.email, expiresAt()],
  });
  return token;
}

// Giriş: önce DB kullanıcısı (e-posta), olmazsa süper yönetici (ADMIN_PASSWORD).
export async function loginAdminUser(
  identifierIn: string, password: string
): Promise<{ token: string; ctx: AdminCtx } | null> {
  const email = String(identifierIn || '').trim().toLowerCase();
  const pw = String(password || '');

  if (email && EMAIL_RE.test(email)) {
    const r = await db.execute({ sql: 'SELECT * FROM randevu_admin_users WHERE email = ?', args: [email] });
    const u: any = r.rows[0];
    if (u && u.is_active && bcrypt.compareSync(pw, String(u.password))) {
      const ctx: AdminCtx = { id: Number(u.id), name: u.name, email: u.email, role: normRole(u.role) };
      return { token: await createSession(ctx), ctx };
    }
    // DB kullanıcısı eşleşmedi → süper yönetici şifresine düşmeden önce email girilmişse
    // yine de ADMIN_PASSWORD ile süper yönetici girişine izin ver (kilitlenmeyi önler).
  }

  // Süper yönetici: fail-closed — secret tanımsızsa devre dışı ('admin123' fallback'i kaldırıldı).
  const superPw = process.env.ADMIN_PASSWORD;
  if (superPw && pw && pw === superPw) {
    const ctx: AdminCtx = { id: null, name: 'Süper Yönetici', email: email || null, role: 'admin' };
    return { token: await createSession(ctx), ctx };
  }
  return null;
}

export async function getAdmin(req: NextRequest): Promise<AdminCtx | null> {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;

  const sr = await db.execute({ sql: 'SELECT * FROM randevu_admin_sessions WHERE token = ?', args: [token] });
  const s: any = sr.rows[0];
  if (!s) return null;
  if (s.expires_at && new Date(s.expires_at) < new Date()) {
    await db.execute({ sql: 'DELETE FROM randevu_admin_sessions WHERE token = ?', args: [token] });
    return null;
  }
  // DB kullanıcısıysa güncel rol/aktiflik durumunu uygula (rol değişince anında etki)
  if (s.user_id != null) {
    const ur = await db.execute({ sql: 'SELECT name, email, role, is_active FROM randevu_admin_users WHERE id = ?', args: [s.user_id] });
    const u: any = ur.rows[0];
    if (!u || !u.is_active) {
      await db.execute({ sql: 'DELETE FROM randevu_admin_sessions WHERE token = ?', args: [token] });
      return null;
    }
    return { id: Number(s.user_id), name: u.name, email: u.email, role: normRole(u.role) };
  }
  return { id: null, name: s.name || 'Süper Yönetici', email: s.email || null, role: normRole(s.role) };
}

export async function logoutAdmin(token: string): Promise<void> {
  if (token) await db.execute({ sql: 'DELETE FROM randevu_admin_sessions WHERE token = ?', args: [token] });
}

// Rota koruması: min role sağlanmazsa hazır NextResponse döner.
export async function guard(
  req: NextRequest, min: Role = 'editor'
): Promise<{ ctx: AdminCtx } | { res: NextResponse }> {
  const ctx = await getAdmin(req);
  if (!ctx) return { res: NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 }) };
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) {
    return { res: NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 }) };
  }
  return { ctx };
}

// ── Admin kullanıcı CRUD (yalnızca 'admin' rolü çağırmalı) ──
export async function listAdminUsers() {
  const r = await db.execute({ sql: 'SELECT id, name, email, role, is_active, created_at FROM randevu_admin_users ORDER BY created_at DESC' });
  return r.rows;
}

export async function createAdminUser(
  nameIn: string, emailIn: string, password: string, roleIn: string
): Promise<{ id: number } | { error: string }> {
  const name = String(nameIn || '').trim();
  const email = String(emailIn || '').trim().toLowerCase();
  const role = normRole(roleIn);
  if (!name) return { error: 'Ad soyad gerekli' };
  if (!EMAIL_RE.test(email)) return { error: 'Geçerli bir e-posta gerekli' };
  if (!password || password.length < 8) return { error: 'Şifre en az 8 karakter olmalı' };
  try {
    const ins = await db.execute({
      sql: 'INSERT INTO randevu_admin_users (name, email, password, role) VALUES (?, ?, ?, ?)',
      args: [name, email, bcrypt.hashSync(password, 10), role],
    });
    return { id: Number(ins.lastInsertRowid) };
  } catch (e: any) {
    if (/UNIQUE/i.test(e?.message || '')) return { error: 'Bu e-posta ile zaten bir kullanıcı var' };
    throw e;
  }
}

export async function updateAdminUser(
  id: number | string, fields: { name?: any; role?: any; is_active?: any; password?: any }
): Promise<{ ok: true } | { error: string }> {
  const sets: string[] = []; const args: any[] = [];
  if (fields.name !== undefined) { const n = String(fields.name).trim(); if (!n) return { error: 'Ad boş olamaz' }; sets.push('name = ?'); args.push(n); }
  if (fields.role !== undefined) { sets.push('role = ?'); args.push(normRole(fields.role)); }
  if (fields.is_active !== undefined) { sets.push('is_active = ?'); args.push(fields.is_active ? 1 : 0); }
  if (fields.password !== undefined && String(fields.password) !== '') {
    if (String(fields.password).length < 8) return { error: 'Şifre en az 8 karakter olmalı' };
    sets.push('password = ?'); args.push(bcrypt.hashSync(String(fields.password), 10));
  }
  if (!sets.length) return { error: 'Güncellenecek alan yok' };
  args.push(id);
  await db.execute({ sql: `UPDATE randevu_admin_users SET ${sets.join(', ')} WHERE id = ?`, args });
  // Pasife alınır/rol değişirse oturum getAdmin'de zaten yeniden doğrulanır.
  return { ok: true };
}

export async function deleteAdminUser(id: number | string): Promise<boolean> {
  await db.execute({ sql: 'DELETE FROM randevu_admin_sessions WHERE user_id = ?', args: [id] });
  const info = await db.execute({ sql: 'DELETE FROM randevu_admin_users WHERE id = ?', args: [id] });
  return !!info.rowsAffected;
}
