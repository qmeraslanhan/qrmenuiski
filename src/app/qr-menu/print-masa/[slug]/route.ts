import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db, ensureInit } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────
// Masa Numaratörü — /qr-menu/print-masa/<slug>?bas=1&son=100
// A4 sayfa başına 4 kart (92×135mm): büyük masa numarası + menü QR'ı
// + İSKİ/İBB logoları. QR vektör (SVG <use>) — 100+ kartta bile hafif.
// Menü gibi herkese açık (QR zaten public menü linkidir).
// ─────────────────────────────────────────────────────────────────

const NAVY = '#24406E';

function esc(s: any): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await ensureInit();
  const { slug } = await params;
  const fr = await db.execute({ sql: 'SELECT * FROM facilities WHERE slug = ?', args: [slug] });
  const f: any = fr.rows[0];
  if (!f) return new NextResponse('Tesis bulunamadı', { status: 404 });

  const url = new URL(req.url);
  const bas = Math.max(1, parseInt(url.searchParams.get('bas') || '1', 10) || 1);
  let son = parseInt(url.searchParams.get('son') || '100', 10) || 100;
  if (son < bas) son = bas;
  if (son - bas > 299) son = bas + 299; // tek seferde en çok 300 kart

  const host = req.headers.get('host') || 'iskisosyaltesisler.com';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const menuUrl = `${proto}://${host}/qr-menu/menu/${f.slug}`;

  // QR'ı SVG olarak bir kez üret; her kart <use> ile aynı vektörü kullanır
  const qrSvg: string = await QRCode.toString(menuUrl, {
    type: 'svg', margin: 0, color: { dark: '#1B2C4F', light: '#FFFFFF' },
  });
  const vb = (qrSvg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 33 33';
  const qrInner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  const cards: string[] = [];
  for (let n = bas; n <= son; n++) {
    cards.push(
      `<div class="card${String(n).length > 2 ? ' n3' : ''}">`
      + '<span class="bar-top"></span>'
      + `<span class="num">${n}</span>`
      + `<span class="qrbox"><svg viewBox="${vb}" role="img" aria-label="Menü QR"><use href="#qrsym"/></svg></span>`
      + '<span class="logos">'
      + '<img src="/img/iski-logo.png" alt="İSKİ" onerror="this.style.display=\'none\'">'
      + '<img src="/img/ibb-mavi.png" alt="İBB" onerror="this.style.display=\'none\'">'
      + '</span>'
      + '<span class="bar-bottom"></span>'
      + '</div>'
    );
  }
  const sheets: string[] = [];
  for (let i = 0; i < cards.length; i += 4) {
    sheets.push('<section class="sheet">' + cards.slice(i, i + 4).join('') + '</section>');
  }

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>masa-kartlari-${esc(f.slug)}-${bas}-${son}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #4a4f58; font-family: 'DM Sans', system-ui, sans-serif; }
  @page { size: A4; margin: 8mm; }

  /* Ekran araç çubuğu (yazdırmada gizlenir) */
  .toolbar { position: sticky; top: 0; z-index: 10; background: #1c2230; color: #eef1f7; padding: 12px 18px;
             display: flex; align-items: center; gap: 14px; flex-wrap: wrap; box-shadow: 0 2px 12px rgba(0,0,0,.35); }
  .toolbar h1 { font-size: 15px; font-weight: 600; margin-right: auto; }
  .toolbar h1 small { display: block; font-size: 11.5px; font-weight: 400; opacity: .65; }
  .toolbar form { display: flex; align-items: center; gap: 7px; font-size: 13px; }
  .toolbar input { width: 64px; padding: 6px 8px; border-radius: 7px; border: 1px solid #3a445c;
                   background: #121724; color: #eef1f7; font-size: 13px; }
  .toolbar button, .toolbar .btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
                   font-weight: 600; font-size: 13px; }
  .btn-ghost { background: #2c3650; color: #dfe6f3; }
  .btn-print { background: #3b82f6; color: #fff; }
  .hint { font-size: 11.5px; opacity: .6; width: 100%; }

  /* A4 yaprağı: 2×2 = 4 kart */
  .sheet { width: 194mm; margin: 10mm auto; display: grid; grid-template-columns: repeat(2, 92mm);
           grid-auto-rows: 135mm; gap: 6mm; justify-content: center; }

  /* Kart — krem zemin, lacivert bantlar, büyük numara, QR, logolar */
  .card { position: relative; width: 92mm; height: 135mm; overflow: hidden;
          background: #F3F0E7;
          background-image: radial-gradient(at 28% 18%, rgba(255,255,255,.55), transparent 60%),
                            radial-gradient(at 78% 85%, rgba(186,178,155,.28), transparent 55%);
          display: flex; flex-direction: column; align-items: center;
          outline: 0.3mm dashed #b6b09e; outline-offset: -0.15mm;
          -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bar-top { width: 42mm; height: 4.6mm; background: ${NAVY}; margin-top: 4.5mm; flex: none; }
  .num { font-family: 'Playfair Display', Georgia, serif; font-weight: 800; color: ${NAVY};
         font-size: 30mm; line-height: 1.05; margin: 4.5mm 0 3.5mm; flex: none; }
  .card.n3 .num { font-size: 23mm; margin: 7mm 0 5mm; }
  .qrbox { width: 56mm; height: 56mm; background: #fff; padding: 3.2mm; flex: none;
           box-shadow: 0 0.6mm 2.4mm rgba(20,30,55,.18); }
  .qrbox svg { width: 100%; height: 100%; display: block; }
  .logos { display: flex; align-items: center; justify-content: center; gap: 8mm; margin-top: 6mm; flex: none; }
  .logos img { height: 11mm; width: auto; }
  .bar-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 6mm; background: ${NAVY}; }

  @media print {
    body { background: none; }
    .toolbar { display: none; }
    .sheet { margin: 0 auto; page-break-after: always; }
    .sheet:last-of-type { page-break-after: auto; }
    .card { outline-color: #cfcaba; }
  }
</style>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><g id="qrsym">${qrInner}</g></defs></svg>
  <header class="toolbar">
    <h1>Masa Kartları — ${esc(f.name)}<small>${esc(menuUrl)} · masa ${bas}–${son} · ${cards.length} kart · ${sheets.length} sayfa (A4, 4 kart/sayfa)</small></h1>
    <form method="get">
      <label>Masa</label>
      <input type="number" name="bas" min="1" value="${bas}">
      <span>–</span>
      <input type="number" name="son" min="1" value="${son}">
      <button type="submit" class="btn-ghost">Uygula</button>
    </form>
    <button class="btn-print" onclick="window.print()">🖨 Yazdır / PDF</button>
    <p class="hint">Kesik çizgiler kesim yerleridir. PDF olarak kaydederseniz dosya adı otomatik gelir. Yazdırma ayarlarında "Arka plan grafikleri" açık olmalıdır.</p>
  </header>
  ${sheets.join('\n')}
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
