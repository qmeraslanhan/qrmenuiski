import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, unauthorized, forbidden } from '@/projects/siparis-takip/auth';
import { getAllOrders, createOrder } from '@/projects/siparis-takip/data';

// GET /siparis-takip/api/orders → tüm siparişler (her iki rol; arayüz ekrana göre filtreler)
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getAllOrders());
}

// POST /siparis-takip/api/orders → yeni sipariş (yalnız yönetici; ihale ise stok atomik düşülür)
export async function POST(req: NextRequest) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  if (user.rol !== 'yonetici') return forbidden('Sipariş girişi yönetici yetkisi gerektirir');

  const b = await req.json().catch(() => ({} as any));
  const r = await createOrder(b, user);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.order, { status: 201 });
}
