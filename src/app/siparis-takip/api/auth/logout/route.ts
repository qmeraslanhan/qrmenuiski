import { NextRequest, NextResponse } from 'next/server';
import { logoutSession } from '@/projects/siparis-takip/auth';

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  await logoutSession(token);
  return NextResponse.json({ ok: true });
}
