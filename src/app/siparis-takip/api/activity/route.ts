import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { guard } from '@/projects/siparis-takip/auth';
import { getActivity } from '@/projects/siparis-takip/activity';

// GET → işlem kayıtları (audit log) — yalnız yönetici
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  return NextResponse.json(await getActivity(150));
}
