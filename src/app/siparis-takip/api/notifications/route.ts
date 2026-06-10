import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, unauthorized } from '@/projects/siparis-takip/auth';
import { getNotifications } from '@/projects/siparis-takip/data';

// GET /siparis-takip/api/notifications → bildirim/alarm log (son 40; ambar ihale bildirimlerini görmez)
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getNotifications(user.rol === 'ambar'));
}
