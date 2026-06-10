// ─────────────────────────────────────────────────────────────────
// İkramlık & Sipariş Takip — kimlik doğrulama + rol bazlı yetki (RBAC).
// Roller: yonetici (tam yetki + kullanıcı yönetimi + loglar) > ambar (sınırlı).
// Giriş: kullanıcı adı + şifre (DB kullanıcısı) VEYA ADMIN_PASSWORD (süper yönetici).
// Süper yönetici DB'de değildir (user_id=null), silinemez; kilitlenmeyi önler.
// Kendi tablosu: siparis_takip_sessions + siparis_takip_kullanicilar.
// ─────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';

const TTL_DAYS = 7;
export type Rol = 'yonetici' | 'ambar';
export const ROL_RANK: Record<Rol, number> = { ambar: 1, yonetici: 2 };
export const ROL_ETIKET: Record<Rol, string> = { yonetici: 'Yönetici', ambar: 'Ambar Çalışanı' };

export type AuthCtx = {
  id: number | null;          // null → süper yönetici (ADMIN_PASSWORD)
  ad: string;
  rol: Rol;
  kullaniciAdi: string | null;
  unvan: string | null;
  bas: string;
  super: boolean;
};

export function normRol(r: any): Rol {
  return r === 'yonetici' || r === 'ambar' ? r : 'ambar';
}
function expiresAt(): string {
  const d = new Date(); d.setDate(d.getDate() + TTL_DAYS); return d.toISOString();
}
export function normUsername(u: any): string {
  return String(u || '').trim().toLowerCase();
}
// Ad → baş harfler (avatar): ilk iki kelimenin baş harfi
export function genBas(ad: string): string {
  const parts = String(ad || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? (parts[parts.length - 1][0] || '') : (parts[0][1] || '');
  return (a + b).toUpperCase();
}

async function createSession(ctx: AuthCtx): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({
    sql: 'INSERT INTO siparis_takip_sessions (token, rol, user_id, ad, expires_at) VALUES (?, ?, ?, ?, ?)',
    args: [token, ctx.rol, ctx.id, ctx.ad, expiresAt()],
  });
  return token;
}

// Giriş: önce DB kullanıcısı (kullanıcı adı), olmazsa süper yönetici (ADMIN_PASSWORD).
export async function loginUser(
  usernameIn: string, password: string
): Promise<{ token: string; ctx: AuthCtx } | null> {
  const kadi = normUsername(usernameIn);
  const pw = String(password || '');

  if (kadi) {
    const r = await db.execute({ sql: 'SELECT * FROM siparis_takip_kullanicilar WHERE kullanici_adi = ?', args: [kadi] });
    const u: any = r.rows[0];
    if (u && Number(u.is_active) === 1 && u.sifre_hash && bcrypt.compareSync(pw, String(u.sifre_hash))) {
      const ctx: AuthCtx = {
        id: Number(u.id), ad: u.ad, rol: normRol(u.rol), kullaniciAdi: u.kullanici_adi,
        unvan: u.unvan || null, bas: u.bas || genBas(u.ad), super: false,
      };
      return { token: await createSession(ctx), ctx };
    }
  }

  // Süper yönetici: fail-closed — secret tanımsızsa devre dışı.
  const superPw = process.env.ADMIN_PASSWORD;
  if (superPw && pw && pw === superPw) {
    const ctx: AuthCtx = {
      id: null, ad: 'Süper Yönetici', rol: 'yonetici', kullaniciAdi: kadi || 'admin',
      unvan: 'Sistem Yöneticisi', bas: 'SY', super: true,
    };
    return { token: await createSession(ctx), ctx };
  }
  return null;
}

export async function getSession(req: NextRequest): Promise<AuthCtx | null> {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;

  const sr = await db.execute({ sql: 'SELECT * FROM siparis_takip_sessions WHERE token = ?', args: [token] });
  const s: any = sr.rows[0];
  if (!s) return null;
  if (s.expires_at && new Date(s.expires_at) < new Date()) {
    await db.execute({ sql: 'DELETE FROM siparis_takip_sessions WHERE token = ?', args: [token] });
    return null;
  }

  // DB kullanıcısıysa güncel rol/aktiflik uygula (rol değişince/pasifleşince anında etki)
  if (s.user_id != null) {
    const ur = await db.execute({
      sql: 'SELECT id, ad, kullanici_adi, rol, unvan, bas, is_active FROM siparis_takip_kullanicilar WHERE id = ?',
      args: [s.user_id],
    });
    const u: any = ur.rows[0];
    if (!u || Number(u.is_active) !== 1) {
      await db.execute({ sql: 'DELETE FROM siparis_takip_sessions WHERE token = ?', args: [token] });
      return null;
    }
    return {
      id: Number(u.id), ad: u.ad, rol: normRol(u.rol), kullaniciAdi: u.kullanici_adi,
      unvan: u.unvan || null, bas: u.bas || genBas(u.ad), super: false,
    };
  }
  return { id: null, ad: s.ad || 'Süper Yönetici', rol: normRol(s.rol), kullaniciAdi: 'admin', unvan: 'Sistem Yöneticisi', bas: 'SY', super: true };
}

export async function logoutSession(token: string): Promise<void> {
  if (token) await db.execute({ sql: 'DELETE FROM siparis_takip_sessions WHERE token = ?', args: [token] });
}

// Rota koruması: min rol sağlanmazsa hazır NextResponse döner.
export async function guard(
  req: NextRequest, min: Rol = 'ambar'
): Promise<{ ctx: AuthCtx } | { res: NextResponse }> {
  const ctx = await getSession(req);
  if (!ctx) return { res: NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 }) };
  if (ROL_RANK[ctx.rol] < ROL_RANK[min]) {
    return { res: NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 }) };
  }
  return { ctx };
}

// ── Kullanıcı yönetimi (yalnız yönetici) ──
export async function listUsers() {
  const r = await db.execute({
    sql: `SELECT id, ad, kullanici_adi, rol, unvan, bas, is_active,
            CASE WHEN sifre_hash IS NULL OR sifre_hash = '' THEN 0 ELSE 1 END AS sifre_var,
            created_at
          FROM siparis_takip_kullanicilar ORDER BY created_at DESC, id DESC`,
  });
  return (r.rows as any[]).map((u) => ({
    id: Number(u.id), ad: u.ad, kullaniciAdi: u.kullanici_adi, rol: normRol(u.rol),
    unvan: u.unvan || '', bas: u.bas || genBas(u.ad), aktif: Number(u.is_active) === 1,
    sifreVar: Number(u.sifre_var) === 1, createdAt: u.created_at,
  }));
}

export async function createUser(
  adIn: string, usernameIn: string, password: string, rolIn: string, unvanIn: string
): Promise<{ id: number } | { error: string }> {
  const ad = String(adIn || '').trim();
  const kadi = normUsername(usernameIn);
  const rol = normRol(rolIn);
  const unvan = String(unvanIn || '').trim() || (rol === 'yonetici' ? 'Yönetici' : 'Ambar Personeli');
  if (!ad) return { error: 'Ad soyad gerekli' };
  if (kadi.length < 3) return { error: 'Kullanıcı adı en az 3 karakter olmalı' };
  if (!/^[a-z0-9._-]+$/.test(kadi)) return { error: 'Kullanıcı adı yalnız harf/rakam/._- içerebilir' };
  if (!password || password.length < 6) return { error: 'Şifre en az 6 karakter olmalı' };
  try {
    const ins = await db.execute({
      sql: 'INSERT INTO siparis_takip_kullanicilar (ad, kullanici_adi, rol, unvan, bas, sifre_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      args: [ad, kadi, rol, unvan, genBas(ad), bcrypt.hashSync(password, 10)],
    });
    return { id: Number(ins.lastInsertRowid) };
  } catch (e: any) {
    if (/UNIQUE/i.test(e?.message || '')) return { error: 'Bu kullanıcı adı zaten alınmış' };
    throw e;
  }
}

export async function updateUser(
  id: number | string,
  fields: { ad?: any; rol?: any; unvan?: any; is_active?: any; password?: any; kullaniciAdi?: any }
): Promise<{ ok: true } | { error: string }> {
  const sets: string[] = []; const args: any[] = [];
  if (fields.ad !== undefined) {
    const n = String(fields.ad).trim(); if (!n) return { error: 'Ad boş olamaz' };
    sets.push('ad = ?'); args.push(n); sets.push('bas = ?'); args.push(genBas(n));
  }
  if (fields.kullaniciAdi !== undefined) {
    const k = normUsername(fields.kullaniciAdi);
    if (k.length < 3) return { error: 'Kullanıcı adı en az 3 karakter olmalı' };
    if (!/^[a-z0-9._-]+$/.test(k)) return { error: 'Kullanıcı adı yalnız harf/rakam/._- içerebilir' };
    sets.push('kullanici_adi = ?'); args.push(k);
  }
  if (fields.rol !== undefined) { sets.push('rol = ?'); args.push(normRol(fields.rol)); }
  if (fields.unvan !== undefined) { sets.push('unvan = ?'); args.push(String(fields.unvan).trim()); }
  if (fields.is_active !== undefined) { sets.push('is_active = ?'); args.push(fields.is_active ? 1 : 0); }
  if (fields.password !== undefined && String(fields.password) !== '') {
    if (String(fields.password).length < 6) return { error: 'Şifre en az 6 karakter olmalı' };
    sets.push('sifre_hash = ?'); args.push(bcrypt.hashSync(String(fields.password), 10));
  }
  if (!sets.length) return { error: 'Güncellenecek alan yok' };
  args.push(id);
  try {
    await db.execute({ sql: `UPDATE siparis_takip_kullanicilar SET ${sets.join(', ')} WHERE id = ?`, args });
  } catch (e: any) {
    if (/UNIQUE/i.test(e?.message || '')) return { error: 'Bu kullanıcı adı zaten alınmış' };
    throw e;
  }
  return { ok: true };
}

export async function deleteUser(id: number | string): Promise<boolean> {
  await db.execute({ sql: 'DELETE FROM siparis_takip_sessions WHERE user_id = ?', args: [id] });
  const info = await db.execute({ sql: 'DELETE FROM siparis_takip_kullanicilar WHERE id = ?', args: [id] });
  return !!info.rowsAffected;
}

export function unauthorized(message = 'Oturum gerekli') {
  return NextResponse.json({ error: message }, { status: 401 });
}
export function forbidden(message = 'Bu işlem için yetkiniz yok') {
  return NextResponse.json({ error: message }, { status: 403 });
}
