import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  const { id } = await params;

  const info = await db.execute({ sql: 'DELETE FROM randevu_closures WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
  return NextResponse.json({ success: true });
}
