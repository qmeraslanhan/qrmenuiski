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
  nameIn: string, emailIn: string, phoneIn: string, password: string
): Promise<{ token: string; member: Member } | { error: string }> {
  const name = String(nameIn || '').trim();
  const email = String(emailIn || '').trim().toLowerCase();
  const phone = String(phoneIn || '').trim();
  if (!name) return { error: 'Ad soyad gerekli' };
  if (!EMAIL_RE.test(email)) return { error: 'Geçerli bir e-posta gerekli' };
  if (phone.replace(/\D/g, '').length < 7) return { error: 'Geçerli bir telefon gerekli' };
  if (!password || password.length < 6) return { error: 'Şifre en az 6 karakter olmalı' };

  const hash = bcrypt.hashSync(password, 10);
  try {
    const ins = await db.execute({
      sql: 'INSERT INTO randevu_members (name, email, phone, password) VALUES (?, ?, ?, ?)',
      args: [name, email, phone, hash],
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
