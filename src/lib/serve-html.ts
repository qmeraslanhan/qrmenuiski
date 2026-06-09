import { NextResponse } from 'next/server';

// Webpack `asset/source` ile HTML'leri bundle'a embed eder.
// Her proje kendi src/projects/<slug>/html/ altında durur.
import adminHtml from '@/projects/qr-menu/html/admin.html';
import loginHtml from '@/projects/qr-menu/html/login.html';
import menuHtml from '@/projects/qr-menu/html/menu.html';
import printMenuHtml from '@/projects/qr-menu/html/print-menu.html';
import tesislerHtml from '@/projects/qr-menu/html/tesisler.html';

// Randevu (berber & kuaför) projesi
import randevuSalonlarHtml from '@/projects/randevu/html/salonlar.html';
import randevuBookingHtml from '@/projects/randevu/html/randevu.html';
import randevuLoginHtml from '@/projects/randevu/html/login.html';
import randevuAdminHtml from '@/projects/randevu/html/admin.html';
import randevuUyeHtml from '@/projects/randevu/html/uye.html';
import randevuHesabimHtml from '@/projects/randevu/html/hesabim.html';
import randevuResetHtml from '@/projects/randevu/html/sifre-sifirla.html';

// İkramlık & Sipariş Takip projesi
import siparisTakipAppHtml from '@/projects/siparis-takip/html/app.html';

// Filename → bundled string. Yeni HTML eklerken bu map'e ekle.
const HTML: Record<string, string> = {
  'qr-menu/admin.html': adminHtml,
  'qr-menu/login.html': loginHtml,
  'qr-menu/menu.html': menuHtml,
  'qr-menu/print-menu.html': printMenuHtml,
  'qr-menu/tesisler.html': tesislerHtml,
  // Randevu projesi
  'randevu/salonlar.html': randevuSalonlarHtml,
  'randevu/randevu.html': randevuBookingHtml,
  'randevu/login.html': randevuLoginHtml,
  'randevu/admin.html': randevuAdminHtml,
  'randevu/uye.html': randevuUyeHtml,
  'randevu/hesabim.html': randevuHesabimHtml,
  'randevu/sifre-sifirla.html': randevuResetHtml,
  // İkramlık & Sipariş Takip projesi
  'siparis-takip/app.html': siparisTakipAppHtml,
  // Geri uyumluluk için kısa isim alias'ları (eski çağrılar bozulmasın)
  'admin.html': adminHtml,
  'login.html': loginHtml,
  'menu.html': menuHtml,
  'print-menu.html': printMenuHtml,
  'tesisler.html': tesislerHtml,
};

export function serveHtml(filename: string): NextResponse {
  const html = HTML[filename];
  if (!html) {
    return new NextResponse(`HTML not found: ${filename}`, { status: 500 });
  }
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
