import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard, listAdminUsers, createAdminUser, ROLE_LABEL, type Role } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

// Yönetici kullanıcıları — yalnızca 'admin' rolü
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const g = await guard(req, 'admin');
  if ('res' in g) return g.res;
  return NextResponse.json(await listAdminUsers());
}

export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const g = await guard(req, 'admin');
  if ('res' in g) return g.res;

  const b = await req.json().catch(() => ({} as any));
  const res = await createAdminUser(b.name, b.email, b.password, b.role);
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 });

  const role = (b.role || 'editor') as Role;
  await logActivity(
    { type: 'admin', id: g.ctx.id, name: g.ctx.name },
    'user.create', 'admin_user', res.id,
    `${g.ctx.name}, ${b.email} kullanıcısını ${ROLE_LABEL[role] || role} olarak ekledi`
  );
  return NextResponse.json({ id: res.id }, { status: 201 });
}
