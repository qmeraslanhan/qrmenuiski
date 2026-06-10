import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, guard, unauthorized, forbidden } from '@/projects/siparis-takip/auth';
import { getOrderById, updateOrder, deleteOrder } from '@/projects/siparis-takip/data';
import { TEDARIK_KOD } from '@/projects/siparis-takip/db-schema';

// GET → tek sipariş (ambar ihale siparişini göremez)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const u = await getSession(req);
  if (!u) return unauthorized();
  const { id } = await params;
  const order = await getOrderById(Number(id));
  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
  if (u.rol === 'ambar' && order.tedarikKod === TEDARIK_KOD.IHALE) return forbidden('Bu sipariş ambar personeline açık değil');
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
