import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const cur = await db.execute({ sql: 'SELECT date FROM randevu_closures WHERE id = ?', args: [id] });
  const cDate = (cur.rows[0] as any)?.date || ('#' + id);
  const info = await db.execute({ sql: 'DELETE FROM randevu_closures WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
  await logActivity(
    { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
    'closure.delete', 'closure', Number(id), `${_g.ctx.name} kapalı günü kaldırdı: ${cDate}`
  );
  return NextResponse.json({ success: true });
}
