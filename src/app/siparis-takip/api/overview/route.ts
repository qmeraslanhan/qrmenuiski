import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, unauthorized } from '@/projects/siparis-takip/auth';
import { getAllOrders, getTender, getNotifications } from '@/projects/siparis-takip/data';

// GET /siparis-takip/api/overview → siparişler + ihale + bildirimler TEK istekte.
// Arayüz açılış/yenileme bunu kullanır: 3 HTTP turu yerine 1 (sorgular paralel).
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  const ambar = user.rol === 'ambar';
  const [orders, tender, notifications] = await Promise.all([
    getAllOrders(ambar),
    getTender(),
    getNotifications(ambar),
  ]);
  return NextResponse.json({ orders, tender, notifications });
}
