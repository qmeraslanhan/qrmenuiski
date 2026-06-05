import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import {
  loginAdmin, clientIp, tooManyAttempts, recordFailedAttempt, clearAttempts, LOGIN_WINDOW_MIN,
} from '@/lib/auth';

// Admin girişi (portal ADMIN_PASSWORD ile ortak)
export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const ip = clientIp(req);
  if (await tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: `Çok fazla başarısız deneme. ${LOGIN_WINDOW_MIN} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }
  const { password } = await req.json().catch(() => ({} as any));
  const result = await loginAdmin(String(password || ''));
  if (!result) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 });
  }
  await clearAttempts(ip);
  return NextResponse.json(result);
}
