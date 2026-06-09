import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, unauthorized } from '@/projects/siparis-takip/auth';
import { setOrderDurum } from '@/projects/siparis-takip/data';

// PATCH /siparis-takip/api/orders/:id/durum  { durum } → durum ilerlet (tek yönlü)
// Ambar yalnızca İç Üretim Ambarı siparişlerini güncelleyebilir (data katmanında zorlanır).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const r = await setOrderDurum(Number(id), b.durum, user);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.order);
}
