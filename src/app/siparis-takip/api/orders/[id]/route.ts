import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, guard, unauthorized } from '@/projects/siparis-takip/auth';
import { getOrderById, updateOrder, deleteOrder } from '@/projects/siparis-takip/data';

// GET → tek sipariş (her iki rol)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const u = await getSession(req);
  if (!u) return unauthorized();
  const { id } = await params;
  const order = await getOrderById(Number(id));
  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
  return NextResponse.json(order);
}

// PUT → sipariş düzenle (yalnız yönetici; ihale stok farkı otomatik düzeltilir)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const r = await updateOrder(Number(id), b, g.ctx);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.order);
}

// DELETE → sipariş sil (yalnız yönetici; ihale stok iade)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const { id } = await params;
  const r = await deleteOrder(Number(id), g.ctx);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, kod: r.kod });
}
