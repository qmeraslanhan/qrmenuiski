// ─────────────────────────────────────────────────────────────────
// Rol-tabanlı oturum — İkramlık & Sipariş Takip'e özel.
// Prototip demo'su şifresizdir (rol seçimi → oturum). Üretimde buraya
// bcrypt/parola eklenebilir; arayüz değişmeden sifre_hash doğrulanır.
// Kendi tablosu: siparis_takip_sessions.
// ─────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';

const TTL_DAYS = 7;
export const ROLLER = ['yonetici', 'ambar'] as const;
export type Rol = (typeof ROLLER)[number];

export type SessionUser = { id: number; ad: string; rol: Rol; unvan: string; bas: string };

function expiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + TTL_DAYS);
  return d.toISOString();
}

// Rol seçimiyle giriş — o role ait kullanıcıyı bulur, oturum açar.
export async function loginRole(rolIn: string): Promise<{ token: string; user: SessionUser } | null> {
  const rol = String(rolIn || '').trim() as Rol;
  if (!ROLLER.includes(rol)) return null;

  const r = await db.execute({
    sql: 'SELECT id, ad, rol, unvan, bas FROM siparis_takip_kullanicilar WHERE rol = ? ORDER BY id LIMIT 1',
    args: [rol],
  });
  const u: any = r.rows[0];
  if (!u) return null;

  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({
    sql: 'INSERT INTO siparis_takip_sessions (token, rol, user_id, ad, expires_at) VALUES (?, ?, ?, ?, ?)',
    args: [token, rol, u.id, u.ad, expiresAt()],
  });
  return { token, user: { id: Number(u.id), ad: u.ad, rol, unvan: u.unvan, bas: u.bas } };
}

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
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
  const ur = await db.execute({
    sql: 'SELECT id, ad, rol, unvan, bas FROM siparis_takip_kullanicilar WHERE id = ?',
    args: [s.user_id],
  });
  const u: any = ur.rows[0];
  if (!u) return null;
  return { id: Number(u.id), ad: u.ad, rol: u.rol, unvan: u.unvan, bas: u.bas };
}

export async function logoutSession(token: string): Promise<void> {
  if (token) await db.execute({ sql: 'DELETE FROM siparis_takip_sessions WHERE token = ?', args: [token] });
}

export function unauthorized(message = 'Oturum gerekli') {
  return NextResponse.json({ error: message }, { status: 401 });
}
export function forbidden(message = 'Bu işlem için yetkiniz yok') {
  return NextResponse.json({ error: message }, { status: 403 });
}
