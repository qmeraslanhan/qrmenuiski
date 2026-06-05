import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { createPasswordReset } from '@/projects/randevu/member-auth';
import { sendEmail, resetEmailHtml } from '@/projects/randevu/email';
import { clientIp, tooManyAttempts, recordFailedAttempt, LOGIN_WINDOW_MIN } from '@/lib/auth';

// Şifre sıfırlama bağlantısı iste. E-posta var/yok bilgisini sızdırmaz.
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
  const reset = await createPasswordReset(String(b.email || ''));
  await recordFailedAttempt(ip); // her isteği say (abuse önleme)

  if (reset) {
    const host = req.headers.get('host') || 'omeraslanhan.com';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const url = `${proto}://${host}/randevu/sifre-sifirla?token=${reset.token}`;
    try {
      await sendEmail({
        to: reset.member.email,
        subject: 'Şifre Sıfırlama — İSKİ Randevu Sistemi',
        html: resetEmailHtml({ name: reset.member.name, url }),
      });
    } catch { /* yut */ }
  }

  // Her durumda aynı yanıt
  return NextResponse.json({ success: true });
}
