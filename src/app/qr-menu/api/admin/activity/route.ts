import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { getActivity } from '@/projects/qr-menu/activity';

// GET /qr-menu/api/admin/activity → işlem kayıtları (son 200) — yalnız admin
export async function GET(req: NextRequest) {
  await ensureInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();
  return NextResponse.json(await getActivity(200));
}
