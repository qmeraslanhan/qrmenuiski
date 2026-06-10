import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, guard, unauthorized } from '@/projects/siparis-takip/auth';
import { getTender, createTenderItem } from '@/projects/siparis-takip/data';

// GET → ihale sözleşme kalemleri + kalan miktar (her iki rol)
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const u = await getSession(req);
  if (!u) return unauthorized();
  return NextResponse.json(await getTender());
}

// POST → yeni ihale kalemi (yalnız yönetici)
export async function POST(req: NextRequest) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => ({} as any));
  const r = await createTenderItem(b, g.ctx);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ id: r.id }, { status: 201 });
}
