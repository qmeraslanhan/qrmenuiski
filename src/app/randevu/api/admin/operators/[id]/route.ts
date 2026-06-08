import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

// Operatör atamasını kaldır
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const _g = await guard(req, 'editor');
  if ('res' in _g) return _g.res;
  const { id } = await params;

  const cur = await db.execute({
    sql: `SELECT m.name, m.email FROM randevu_salon_operators o JOIN randevu_members m ON m.id=o.member_id WHERE o.id = ?`,
    args: [id],
  });
  const who: any = cur.rows[0];
  const info = await db.execute({ sql: 'DELETE FROM randevu_salon_operators WHERE id = ?', args: [id] });
  if (!info.rowsAffected) return NextResponse.json({ error: 'Atama bulunamadı' }, { status: 404 });
  await logActivity(
    { type: 'admin', id: _g.ctx.id, name: _g.ctx.name },
    'operator.remove', 'operator', Number(id),
    `${_g.ctx.name}, ${who ? who.name + ' (' + who.email + ')' : '#' + id} kullanıcının salon yetkisini kaldırdı`
  );
  return NextResponse.json({ success: true });
}
