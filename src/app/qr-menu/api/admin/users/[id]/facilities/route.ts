import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, isAdmin, refreshUserFacilities, unauthorized, forbidden } from '@/lib/auth';
import { logActivity } from '@/projects/qr-menu/activity';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const userId = Number(id);
  const userResult = await db.execute({ sql: 'SELECT id, username FROM users WHERE id=?', args: [userId] });
  if (!userResult.rows[0]) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const facilityIds = (Array.isArray(b.facilityIds) ? b.facilityIds : []).map(Number).filter(Boolean);

  await db.execute({ sql: 'DELETE FROM user_facilities WHERE user_id=?', args: [userId] });
  for (const fid of facilityIds) {
    await db.execute({
      sql: 'INSERT INTO user_facilities (user_id, facility_id) VALUES (?, ?)',
      args: [userId, fid],
    });
  }

  await refreshUserFacilities(userId, facilityIds);
  await logActivity(auth, 'kullanici.tesisler', 'kullanici', userId, `${(userResult.rows[0] as any).username} — ${facilityIds.length} tesis yetkisi atandı`);
  return NextResponse.json({ success: true });
}
