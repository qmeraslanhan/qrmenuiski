import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession, unauthorized } from '@/projects/siparis-takip/auth';
import { getTender } from '@/projects/siparis-takip/data';

// GET /siparis-takip/api/tender → ihale sözleşme kalemleri + kalan miktar
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const user = await getSession(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getTender());
}
