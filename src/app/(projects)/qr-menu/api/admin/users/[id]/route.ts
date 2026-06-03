import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const info = await db.execute({ sql: 'DELETE FROM users WHERE id=?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true });
}
