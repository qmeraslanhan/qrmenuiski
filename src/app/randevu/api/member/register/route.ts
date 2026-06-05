import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { registerMember } from '@/projects/randevu/member-auth';
import { clientIp, tooManyAttempts, recordFailedAttempt, LOGIN_WINDOW_MIN } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const ip = clientIp(req);
  if (await tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: `Çok fazla deneme. ${LOGIN_WINDOW_MIN} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }
  const b = await req.json().catch(() => ({} as any));
  const result = await registerMember(b.name, b.email, b.phone, b.password);
  if ('error' in result) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}
