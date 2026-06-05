import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { loginMember } from '@/projects/randevu/member-auth';
import { clientIp, tooManyAttempts, recordFailedAttempt, clearAttempts, LOGIN_WINDOW_MIN } from '@/lib/auth';

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
  const result = await loginMember(b.email, b.password);
  if (!result) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: 'E-posta veya şifre hatalı' }, { status: 401 });
  }
  await clearAttempts(ip);
  return NextResponse.json(result);
}
