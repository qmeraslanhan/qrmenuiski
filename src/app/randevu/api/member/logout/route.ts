import { NextRequest, NextResponse } from 'next/server';
import { logoutMember } from '@/projects/randevu/member-auth';

export async function POST(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  await logoutMember(token);
  return NextResponse.json({ success: true });
}
