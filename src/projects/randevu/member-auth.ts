// ─────────────────────────────────────────────────────────────────
// Üye (müşteri) kimlik doğrulama — randevu projesine özel, qr-menu'den bağımsız.
// Kendi tabloları: randevu_members + randevu_member_sessions.
// ─────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { db } from '@/lib/d1';

const TTL_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Member = { id: number; name: string; email: string; phone: string };

function expiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + TTL_DAYS);
  return d.toISOString();
}

async function createSession(memberId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({
    sql: 'INSERT INTO randevu_member_sessions (token, member_id, expires_at) VALUES (?, ?, ?)',
    args: [token, memberId, expiresAt()],
  });
  return token;
}

export async function registerMember(
  nameIn: string, emailIn: string, phoneIn: string, password: string, kvkk: boolean
): Promise<{ token: string; member: Member } | { error: string }> {
  const name = String(nameIn || '').trim();
  const email = String(emailIn || '').trim().toLowerCase();
  const phone = String(phoneIn || '').trim();
  if (!name) return { error: 'Ad soyad gerekli' };
  if (!EMAIL_RE.test(email)) return { error: 'Geçerli bir e-posta gerekli' };
  if (phone.replace(/\D/g, '').length < 7) return { error: 'Geçerli bir telefon gerekli' };
  if (!password || password.length < 6) return { error: 'Şifre en az 6 karakter olmalı' };
  if (!kvkk) return { error: 'KVKK aydınlatma metnini onaylamalısınız' };

  const hash = bcrypt.hashSync(password, 10);
  try {
    const ins = await db.execute({
      sql: 'INSERT INTO randevu_members (name, email, phone, password, kvkk_accepted_at) VALUES (?, ?, ?, ?, ?)',
      args: [name, email, phone, hash, new Date().toISOString()],
    });
    const member: Member = { id: Number(ins.lastInsertRowid), name, email, phone };
    const token = await createSession(member.id);
    return { token, member };
  } catch (e: any) {
    if (/UNIQUE/i.test(e?.message || '')) return { error: 'Bu e-posta ile zaten bir üyelik var' };
    throw e;
  }
}

export async function loginMember(emailIn: string, password: string): Promise<{ token: string; member: Member } | null> {
  const email = String(emailIn || '').trim().toLowerCase();
  const r = await db.execute({ sql: 'SELECT * FROM randevu_members WHERE email = ?', args: [email] });
  const m: any = r.rows[0];
  if (!m) return null;
  if (!bcrypt.compareSync(String(password || ''), String(m.password))) return null;
  const token = await createSession(m.id);
  return { token, member: { id: Number(m.id), name: m.name, email: m.email, phone: m.phone } };
}

export async function getMember(req: NextRequest): Promise<Member | null> {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;

  const sr = await db.execute({ sql: 'SELECT * FROM randevu_member_sessions WHERE token = ?', args: [token] });
  const s: any = sr.rows[0];
  if (!s) return null;
  if (s.expires_at && new Date(s.expires_at) < new Date()) {
    await db.execute({ sql: 'DELETE FROM randevu_member_sessions WHERE token = ?', args: [token] });
    return null;
  }
  const mr = await db.execute({ sql: 'SELECT id, name, email, phone FROM randevu_members WHERE id = ?', args: [s.member_id] });
  const m: any = mr.rows[0];
  if (!m) return null;
  return { id: Number(m.id), name: m.name, email: m.email, phone: m.phone };
}

export async function logoutMember(token: string): Promise<void> {
  if (token) await db.execute({ sql: 'DELETE FROM randevu_member_sessions WHERE token = ?', args: [token] });
}

// ── Şifre sıfırlama ──
const RESET_TTL_MIN = 60;

// E-posta varsa sıfırlama token'ı üretir. (Yoksa null — çağıran taraf yine başarı döner.)
export async function createPasswordReset(emailIn: string): Promise<{ token: string; member: Member } | null> {
  const email = String(emailIn || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  const r = await db.execute({ sql: 'SELECT id, name, email, phone FROM randevu_members WHERE email = ?', args: [email] });
  const m: any = r.rows[0];
  if (!m) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + RESET_TTL_MIN * 60_000).toISOString();
  await db.execute({
    sql: 'INSERT INTO randevu_password_resets (member_id, token, expires_at) VALUES (?, ?, ?)',
    args: [m.id, token, exp],
  });
  return { token, member: { id: Number(m.id), name: m.name, email: m.email, phone: m.phone } };
}

export async function resetPassword(tokenIn: string, newPassword: string): Promise<{ ok: true } | { error: string }> {
  const token = String(tokenIn || '');
  if (!token) return { error: 'Geçersiz bağlantı' };
  if (!newPassword || newPassword.length < 6) return { error: 'Şifre en az 6 karakter olmalı' };

  const r = await db.execute({ sql: 'SELECT * FROM randevu_password_resets WHERE token = ?', args: [token] });
  const row: any = r.rows[0];
  if (!row) return { error: 'Geçersiz veya kullanılmış bağlantı' };
  if (row.used) return { error: 'Bu bağlantı zaten kullanılmış' };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { error: 'Bağlantının süresi dolmuş' };

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.execute({ sql: 'UPDATE randevu_members SET password = ? WHERE id = ?', args: [hash, row.member_id] });
  await db.execute({ sql: 'UPDATE randevu_password_resets SET used = 1 WHERE id = ?', args: [row.id] });
  // Güvenlik: mevcut oturumları kapat
  await db.execute({ sql: 'DELETE FROM randevu_member_sessions WHERE member_id = ?', args: [row.member_id] });
  return { ok: true };
}
