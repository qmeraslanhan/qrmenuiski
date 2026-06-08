import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getMember } from '@/projects/randevu/member-auth';
import { isOperatorOf } from '@/projects/randevu/operator';
import { logActivity } from '@/projects/randevu/activity';

const ST_LABEL: Record<string, string> = { approved: 'Onaylı', done: 'Tamamlandı', noshow: 'Gelmedi', cancelled: 'İptal' };

// Operatör yalnızca bu durumlara çekebilir (onaylama/iptal/gelmedi/tamamlandı)
const VALID = ['approved', 'done', 'noshow', 'cancelled'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureRandevuInit();
  const member = await getMember(req);
  if (!member) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
  const { id } = await params;

  const cur = await db.execute({ sql: 'SELECT * FROM randevu_appointments WHERE id = ?', args: [id] });
  const appt: any = cur.rows[0];
  if (!appt) return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 });

  if (!(await isOperatorOf(member.id, appt.salon_id))) {
    return NextResponse.json({ error: 'Bu randevu için yetkiniz yok' }, { status: 403 });
  }

  const b = await req.json().catch(() => ({} as any));
  const status = String(b.status || '').trim();
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 });

  const note = `Operatör (${member.name})`;
  await db.execute({
    sql: `UPDATE randevu_appointments SET status = ?, decided_note = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [status, note, id],
  });
  await logActivity(
    { type: 'operator', id: member.id, name: member.name },
    'appointment.operator_status', 'appointment', Number(id),
    `${member.name} (operatör) randevuyu “${ST_LABEL[status] || status}” yaptı — ${appt.customer_name || ''} · ${appt.date} ${appt.time}`
  );
  const row = await db.execute({ sql: 'SELECT * FROM randevu_appointments WHERE id = ?', args: [id] });
  return NextResponse.json(row.rows[0]);
}
