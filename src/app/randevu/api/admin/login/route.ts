import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { clientIp, tooManyAttempts, recordFailedAttempt, clearAttempts, LOGIN_WINDOW_MIN } from '@/lib/auth';
import { loginAdminUser } from '@/projects/randevu/admin-auth';
import { logActivity } from '@/projects/randevu/activity';

// Admin paneli girişi — e-posta + şifre (DB kullanıcısı) veya yalnız şifre (süper yönetici)
export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const ip = clientIp(req);
  if (await tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: `Çok fazla başarısız deneme. ${LOGIN_WINDOW_MIN} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => ({} as any));
  const email = String(body.email || body.identifier || '');
  const password = String(body.password || '');

  const result = await loginAdminUser(email, password);
  if (!result) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Hatalı e-posta veya şifre' }, { status: 401 });
  }
  await clearAttempts(ip);
  await logActivity(
    { type: 'admin', id: result.ctx.id, name: result.ctx.name },
    'admin.login', 'session', result.ctx.id, `${result.ctx.name} giriş yaptı`
  );
  return NextResponse.json({ token: result.token, role: result.ctx.role, name: result.ctx.name });
}
