import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db, ensureInit, isUniqueError } from '@/lib/db';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { logActivity } from '@/projects/qr-menu/activity';

export async function GET(req: NextRequest) {
  await ensureInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const usersResult = await db.execute('SELECT id, username, can_create_fac, created_at FROM users ORDER BY id');
  const users = usersResult.rows as any[];
  for (const u of users) {
    const fr = await db.execute({
      sql: `SELECT f.id, f.name FROM user_facilities uf
            JOIN facilities f ON f.id = uf.facility_id
            WHERE uf.user_id = ? ORDER BY f.name`,
      args: [u.id],
    });
    u.facilities = fr.rows;
  }
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const b = await req.json().catch(() => ({}));
  const username = String(b.username || '').trim();
  const password = b.password;
  if (!username || !password) return NextResponse.json({ error: 'Kullanıcı adı ve şifre zorunludur' }, { status: 400 });

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const canCreate = b.canCreateFac ? 1 : 0;
    const info = await db.execute({
      sql: 'INSERT INTO users (username, password, can_create_fac) VALUES (?, ?, ?)',
      args: [username, hashed, canCreate],
    });
    await logActivity(auth, 'kullanici.olustur', 'kullanici', Number(info.lastInsertRowid), `${username} oluşturuldu${canCreate ? ' (tesis ekleyebilir)' : ''}`);
    return NextResponse.json({ id: Number(info.lastInsertRowid), username, can_create_fac: canCreate, facilities: [] }, { status: 201 });
  } catch (e: any) {
    if (isUniqueError(e)) return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanımda' }, { status: 409 });
    throw e;
  }
}
