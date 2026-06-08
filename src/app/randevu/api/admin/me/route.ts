import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { guard } from '@/projects/randevu/admin-auth';

// Giriş yapan yöneticinin kimliği + rolü (UI yetki/menü için)
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const g = await guard(req, 'viewer');
  if ('res' in g) return g.res;
  const { id, name, email, role } = g.ctx;
  return NextResponse.json({ id, name, email, role });
}
