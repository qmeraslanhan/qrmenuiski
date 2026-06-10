import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { clientIp, tooManyAttempts, recordFailedAttempt, clearAttempts, LOGIN_WINDOW_MIN } from '@/lib/auth';
import { loginUser } from '@/projects/siparis-takip/auth';
import { logActivity } from '@/projects/siparis-takip/activity';

// POST /siparis-takip/api/auth/login  { kullaniciAdi, sifre } → { token, user }
// DB kullanıcısı (kullanıcı adı + şifre) veya süper yönetici (ADMIN_PASSWORD).
export async function POST(req: NextRequest) {
  await ensureSiparisInit();
  const ip = clientIp(req);
  if (await tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: `Çok fazla başarısız deneme. ${LOGIN_WINDOW_MIN} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }
  const b = await req.json().catch(() => ({} as any));
  const r = await loginUser(b.kullaniciAdi ?? b.username ?? '', b.sifre ?? b.password ?? '');
  if (!r) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Hatalı kullanıcı adı veya şifre' }, { status: 401 });
  }
  await clearAttempts(ip);
  await logActivity(r.ctx, 'giris', 'oturum', r.ctx.id, `${r.ctx.ad} giriş yaptı`);
  const u = r.ctx;
  return NextResponse.json({
    token: r.token,
    user: { id: u.id, ad: u.ad, rol: u.rol, kullaniciAdi: u.kullaniciAdi, unvan: u.unvan, bas: u.bas, super: u.super },
  });
}
