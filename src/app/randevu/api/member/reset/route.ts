import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { resetPassword } from '@/projects/randevu/member-auth';

// Yeni şifreyi token ile uygula
export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const b = await req.json().catch(() => ({} as any));
  const result = await resetPassword(String(b.token || ''), String(b.password || ''));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
