import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, unauthorized } from '@/projects/siparis-takip/auth';
import { getOrderById } from '@/projects/siparis-takip/data';

// GET /siparis-takip/api/orders/:id → tek sipariş (kalemleri dahil)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  const { id } = await params;
  const order = await getOrderById(Number(id));
  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
  return NextResponse.json(order);
}
