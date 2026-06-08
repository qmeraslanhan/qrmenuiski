import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Pasife alınmış sistemlerin (örn. /qr-menu, /randevu) tüm alt yollarına
// erişimi engeller. Durum D1'deki `dashboard_systems` tablosundan okunur.
//
// GÜVENLİK İLKESİ: fail-open. Durum okunamazsa (DB/şema hatası) erişime
// İZİN verilir — çalışan production hiçbir koşulda kilitlenmez.
export async function middleware(req: NextRequest) {
  const slug = req.nextUrl.pathname.split('/')[1];
  if (!slug) return NextResponse.next();

  try {
    const { env } = await getCloudflareContext({ async: true });
    const d1 = (env as any).DB;
    if (!d1) return NextResponse.next();

    const row = await d1
      .prepare('SELECT is_active FROM dashboard_systems WHERE slug = ?')
      .bind(slug)
      .first();

    if (row && Number(row.is_active) === 0) {
      return new NextResponse(maintenancePage(), {
        status: 503,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'retry-after': '3600',
        },
      });
    }
  } catch {
    // fail-open — erişime izin ver
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/qr-menu/:path*', '/randevu/:path*'],
};

function maintenancePage(): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sistem şu an pasif</title>
<style>
  :root { --bg:#F5F1E8; --ink:#1c2733; --mute:#6b7785; --accent:#0F4C81; --line:#e3ddd0; --surface:#fffdf8; }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
         background:var(--bg); color:var(--ink); font-family:'DM Sans',system-ui,-apple-system,sans-serif; }
  .card { max-width:440px; width:100%; text-align:center; background:var(--surface); border:1px solid var(--line);
          border-radius:20px; padding:40px 32px; box-shadow:0 8px 30px rgba(15,76,129,.06); }
  .icon { width:56px; height:56px; margin:0 auto 20px; border-radius:14px; background:rgba(15,76,129,.08);
          display:flex; align-items:center; justify-content:center; color:var(--accent); }
  h1 { font-size:22px; margin:0 0 10px; font-weight:600; }
  p { color:var(--mute); font-size:15px; line-height:1.6; margin:0 0 24px; }
  a { display:inline-block; text-decoration:none; color:#fff; background:var(--accent); padding:11px 22px;
      border-radius:10px; font-size:14px; font-weight:500; transition:opacity .2s; }
  a:hover { opacity:.9; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6A2.25 2.25 0 0116.5 21h-9A2.25 2.25 0 015.25 18.75v-6a2.25 2.25 0 012.25-2.25z" />
      </svg>
    </div>
    <h1>Bu sistem şu an pasif</h1>
    <p>İlgili hizmet geçici olarak yönetici tarafından kapatılmıştır. Lütfen daha sonra tekrar deneyin.</p>
    <a href="/">Ana sayfaya dön</a>
  </div>
</body>
</html>`;
}
