import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_TTL_DAYS = 7;

function expiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_TTL_DAYS);
  return d.toISOString();
}

export async function loginAdmin(password: string) {
  if (password !== ADMIN_PASSWORD) return null;
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute({
    sql: 'INSERT INTO sessions (token, role, expires_at) VALUES (?, ?, ?)',
    args: [token, 'admin', expiresAt()],
  });
  return { token, role: 'admin' as const };
}

export async function loginUser(username: string, password: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username.trim()],
  });
  const user: any = result.rows[0];
  if (!user) return null;

  const isHashed = String(user.password).startsWith('$2');
  const match = isHashed
    ? bcrypt.compareSync(password, user.password)
    : password === user.password;
  if (!match) return null;

  if (!isHashed) {
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [bcrypt.hashSync(password, 10), user.id],
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const facilities = await db.execute({
    sql: 'SELECT facility_id FROM user_facilities WHERE user_id = ?',
    args: [user.id],
  });
  await db.execute({
    sql: 'INSERT INTO sessions (token, role, user_id, username, expires_at) VALUES (?, ?, ?, ?, ?)',
    args: [token, 'user', user.id, user.username, expiresAt()],
  });
  for (const r of facilities.rows as any[]) {
    await db.execute({
      sql: 'INSERT INTO session_facilities (token, facility_id) VALUES (?, ?)',
      args: [token, r.facility_id],
    });
  }
  return { token, role: 'user' as const };
}

export async function logout(token: string) {
  if (!token) return;
  await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
}

export type Auth =
  | { role: 'admin' }
  | { role: 'user'; userId: number; username: string; facilityIds: Set<number> };

export async function getAuth(req: NextRequest): Promise<Auth | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const sessionResult = await db.execute({
    sql: 'SELECT * FROM sessions WHERE token = ?',
    args: [token],
  });
  const session: any = sessionResult.rows[0];
  if (!session) return null;

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
    return null;
  }

  if (session.role === 'admin') return { role: 'admin' };

  const facs = await db.execute({
    sql: 'SELECT facility_id FROM session_facilities WHERE token = ?',
    args: [token],
  });
  return {
    role: 'user',
    userId: Number(session.user_id),
    username: String(session.username),
    facilityIds: new Set((facs.rows as any[]).map((r) => Number(r.facility_id))),
  };
}

export function unauthorized(message = 'Yetkisiz erişim') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Bu işlem için yönetici yetkisi gereklidir') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function isAdmin(auth: Auth | null): auth is { role: 'admin' } {
  return auth?.role === 'admin';
}

export function canAccessFacility(auth: Auth | null, facilityId: number | string): boolean {
  if (!auth) return false;
  if (auth.role === 'admin') return true;
  return auth.facilityIds.has(Number(facilityId));
}

export async function refreshUserFacilities(userId: number, facilityIds: number[]) {
  const sessions = await db.execute({
    sql: 'SELECT token FROM sessions WHERE user_id = ?',
    args: [userId],
  });
  for (const s of sessions.rows as any[]) {
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

// Rate limit (login)
const LOGIN_WINDOW_MIN = 15;
const LOGIN_MAX_ATTEMPTS = 8;

export function clientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for') || '';
  if (xf) return xf.split(',')[0].trim();
  return 'unknown';
}

export async function tooManyAttempts(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MIN * 60_000).toISOString();
  const r = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND attempted_at > ?',
    args: [ip, since],
  });
  return Number((r.rows[0] as any).n) >= LOGIN_MAX_ATTEMPTS;
}

export async function recordFailedAttempt(ip: string) {
  await db.execute({
    sql: 'INSERT INTO login_attempts (ip) VALUES (?)',
    args: [ip],
  });
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  await db.execute({ sql: 'DELETE FROM login_attempts WHERE attempted_at < ?', args: [cutoff] });
}

export async function clearAttempts(ip: string) {
  await db.execute({ sql: 'DELETE FROM login_attempts WHERE ip = ?', args: [ip] });
}

export { LOGIN_WINDOW_MIN };
