import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import {
  loginAdmin,
  clientIp, tooManyAttempts, recordFailedAttempt, clearAttempts,
  LOGIN_WINDOW_MIN,
} from '@/lib/auth';

// Portal dashboard yönetici girişi — mevcut ADMIN_PASSWORD ile.
// Başarılı olursa session token döner (sessions tablosu, role='admin').
export async function POST(req: NextRequest) {
  await ensureInit(); // sessions + login_attempts tablolarını garanti et
  const ip = clientIp(req);
  if (await tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: `Çok fazla başarısız deneme. ${LOGIN_WINDOW_MIN} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }

  const { password } = await req.json().catch(() => ({}));
  const result = await loginAdmin(String(password ?? ''));
  if (!result) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 });
  }
  await clearAttempts(ip);
  return NextResponse.json({ token: result.token });
}
