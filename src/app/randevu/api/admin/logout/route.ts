import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin } from '@/projects/randevu/admin-auth';

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  await logoutAdmin(token);
  return NextResponse.json({ success: true });
}
