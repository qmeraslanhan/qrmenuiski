import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import {
  loginAdmin, loginUser,
  clientIp, tooManyAttempts, recordFailedAttempt, clearAttempts,
  LOGIN_WINDOW_MIN,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  await ensureInit();
  const ip = clientIp(req);
  if (await tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: `Çok fazla başarısız deneme. ${LOGIN_WINDOW_MIN} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  if (!username || String(username).trim() === '') {
    const result = await loginAdmin(password);
    if (!result) { await recordFailedAttempt(ip); return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 }); }
    await clearAttempts(ip);
    return NextResponse.json(result);
  }

  const result = await loginUser(username, password);
  if (!result) { await recordFailedAttempt(ip); return NextResponse.json({ error: 'Hatalı kullanıcı adı veya şifre' }, { status: 401 }); }
  await clearAttempts(ip);
  return NextResponse.json(result);
}
