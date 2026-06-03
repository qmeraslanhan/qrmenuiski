import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { logout } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await ensureInit();
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  await logout(token);
  return NextResponse.json({ success: true });
}
