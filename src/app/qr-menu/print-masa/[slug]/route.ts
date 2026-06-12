import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db, ensureInit } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────
// Masa Numaratörü — /qr-menu/print-masa/<slug>?bas=1&son=100
// Kart ölçüsü 100×150mm (10×15cm) — A4 portrait sayfada yan yana 2 kart.
// Tasarım, fiyat listesi PDF'iyle (print-menu.html) aynı dildedir:
// paper zemin + altın köşe ornamentleri + çift ince çerçeve + Playfair
// numara + Cormorant italik altyazı + tesis tema rengi.
// QR vektör (SVG <use>) — 100+ kartta bile hafif. Sayfa public.
// ─────────────────────────────────────────────────────────────────

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
  // Çift yüz (arkalı önlü) varsayılan: her ön sayfanın ardından, kart sırası
  // yatayda aynalanmış ARKA sayfa gelir → uzun kenardan çevirmeli duplekste
  // her kartın arkası birebir kendi önüne denk gelir.
  const cift = url.searchParams.get('yuz') !== 'tek';

  const theme = (typeof f.theme_color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(f.theme_color)) ? f.theme_color : '#1e293b';

  const host = req.headers.get('host') || 'iskisosyaltesisler.com';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const menuUrl = `${proto}://${host}/qr-menu/menu/${f.slug}`;

  // QR'ı SVG olarak bir kez üret; her kart <use> ile aynı vektörü kullanır
  const qrSvg: string = await QRCode.toString(menuUrl, {
    type: 'svg', margin: 0, color: { dark: '#1a1a1a', light: '#FFFFFF' },
  });
  const vb = (qrSvg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 33 33';
  const qrInner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  const cards: string[] = [];
  for (let n = bas; n <= son; n++) {
    cards.push(
      `<div class="card${String(n).length > 2 ? ' n3' : ''}">`
      + '<span class="frame-outer"></span><span class="frame-inner"></span>'
      + '<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>'
      + '<span class="tag">Masa</span>'
      + `<span class="num">${n}</span>`
      + '<span class="ornament"><i class="o-line"></i><i class="o-circle"></i><i class="o-diamond"></i><i class="o-circle"></i><i class="o-line"></i></span>'
      + `<span class="qr-box"><svg viewBox="${vb}" role="img" aria-label="Menü QR"><use href="#qrsym"/></svg></span>`
      + '<span class="scan">Kareyi taratarak güncel menüye ulaşın</span>'
      + `<span class="brand">${esc(f.name)} — QR Menü</span>`
      + '<span class="logos">'
      + '<img src="/img/iski-logo.png" alt="İSKİ" onerror="this.style.display=\'none\'">'
      + '<img src="/img/ibb-mavi.png" alt="İBB" onerror="this.style.display=\'none\'">'
      + '</span>'
      + '</div>'
    );
  }
  const ph = '<div class="ph"></div>'; // tek kart kalan sayfada hizayı koruyan boş yer tutucu
  const sheets: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    const a = cards[i], b = cards[i + 1];
    sheets.push('<section class="sheet" data-side="ÖN">' + a + (b || (cift ? ph : '')) + '</section>');
    if (cift) {
      // Arka sayfa: sütunlar yer değiştirir (yatay ayna) → duplekste birebir hizalanır
      sheets.push('<section class="sheet" data-side="ARKA">' + (b || ph) + a + '</section>');
    }
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
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Cormorant+Garamond:wght@500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Fiyat listesi (print-menu.html) ile aynı tasarım dili */
  :root {
    --theme: ${theme};
    --gold: #b8860b;
    --paper: #faf6ed;
    --ink: #1a1a1a;
    --ink-soft: #5b5b5b;
    --line: #c9bf9c;
    --line-soft: #e5dcc1;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { background: #474c55; font-family: 'DM Sans', system-ui, sans-serif; }
  @page { size: A4; margin: 4mm; }

  /* Ekran araç çubuğu (yazdırmada gizlenir) */
  .toolbar { position: sticky; top: 0; z-index: 10; background: var(--theme); color: #f4f6fb; padding: 12px 18px;
             display: flex; align-items: center; gap: 14px; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
  .toolbar h1 { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 700; letter-spacing: 1px; margin-right: auto; }
  .toolbar h1 small { display: block; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 400; opacity: .65; letter-spacing: 0; margin-top: 2px; }
  .toolbar form { display: flex; align-items: center; gap: 7px; font-size: 13px; }
  .toolbar input { width: 64px; padding: 6px 8px; border-radius: 0; border: 1px solid rgba(255,255,255,.3);
                   background: rgba(0,0,0,.25); color: #f4f6fb; font-size: 13px; }
  .toolbar button { padding: 9px 18px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
                    font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .btn-ghost { background: rgba(255,255,255,.14); color: #fff; }
  .btn-print { background: var(--gold); color: #fff; }
  .hint { font-size: 11px; opacity: .6; width: 100%; }

  /* A4 yaprağı: yan yana 2 kart (100×150mm) */
  .sheet { position: relative; width: 202mm; margin: 14mm auto 10mm; background: #fff; padding: 12mm 0;
           display: grid; grid-template-columns: repeat(2, 100mm); gap: 2mm;
           justify-content: center; align-content: center; box-shadow: 0 8px 30px rgba(0,0,0,.35); }
  /* Ekranda ÖN/ARKA etiketi (yazdırmada görünmez) */
  .sheet::before { content: attr(data-side); position: absolute; top: -6.5mm; left: 2mm;
                   font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #cdd5e2; }
  .ph { width: 100mm; height: 150mm; visibility: hidden; }

  /* Kart — 10×15cm, fiyat listesi estetiği */
  .card { position: relative; width: 100mm; height: 150mm; overflow: hidden;
          background:
            radial-gradient(circle at 20% 10%, rgba(184,134,11,0.05), transparent 50%),
            radial-gradient(circle at 80% 90%, rgba(30,41,59,0.04), transparent 50%),
            var(--paper);
          display: flex; flex-direction: column; align-items: center;
          outline: 0.25mm dashed #b9b29c; outline-offset: -0.1mm; }

  /* Çift ince çerçeve + altın köşe ornamentleri */
  .frame-outer { position: absolute; inset: 4mm; border: 1px solid var(--line); pointer-events: none; }
  .frame-inner { position: absolute; inset: 5.4mm; border: 1px solid var(--line-soft); pointer-events: none; }
  .corner { position: absolute; width: 9mm; height: 9mm; pointer-events: none; }
  .corner.tl { top: 2.8mm; left: 2.8mm; }
  .corner.tr { top: 2.8mm; right: 2.8mm; transform: scaleX(-1); }
  .corner.bl { bottom: 2.8mm; left: 2.8mm; transform: scaleY(-1); }
  .corner.br { bottom: 2.8mm; right: 2.8mm; transform: scale(-1,-1); }
  .corner::before, .corner::after { content: ''; position: absolute; background: var(--gold); }
  .corner::before { top: 0; left: 0; width: 5mm; height: 1px; }
  .corner::after  { top: 0; left: 0; width: 1px; height: 5mm; }

  .tag { font-size: 9px; letter-spacing: 7px; color: var(--gold); text-transform: uppercase;
         font-weight: 600; margin-top: 12mm; flex: none; }
  .num { font-family: 'Playfair Display', serif; font-weight: 800; color: var(--theme);
         font-size: 31mm; line-height: 1; margin: 2.5mm 0 0; flex: none; }
  .card.n3 .num { font-size: 24mm; margin-top: 5mm; }

  .ornament { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 3.5mm 0 4mm; flex: none; }
  .o-line { width: 13mm; height: 1px; background: linear-gradient(to right, transparent, var(--gold), transparent); }
  .o-diamond { width: 4px; height: 4px; background: var(--gold); transform: rotate(45deg); }
  .o-circle { width: 3.6px; height: 3.6px; border: 1px solid var(--gold); border-radius: 50%; }

  .qr-box { width: 47mm; height: 47mm; background: #fff; padding: 2.6mm; flex: none;
            border: 1px solid var(--line); box-shadow: 0 2px 6px rgba(0,0,0,.05); }
  .qr-box svg { width: 100%; height: 100%; display: block; }

  .scan { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500;
          font-size: 11.5px; color: var(--ink-soft); letter-spacing: .3px; margin-top: 3.5mm; flex: none; }
  .brand { font-size: 8px; letter-spacing: 3px; color: var(--gold); font-weight: 600;
           text-transform: uppercase; margin-top: 1.6mm; flex: none; max-width: 80mm;
           text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .logos { display: flex; align-items: center; justify-content: center; gap: 7mm;
           margin-top: auto; margin-bottom: 8.5mm; flex: none; }
  .logos img { height: 9.5mm; width: auto; }

  @media print {
    body { background: none; }
    .toolbar { display: none; }
    .sheet { width: auto; height: 287mm; margin: 0; padding: 0; box-shadow: none;
             page-break-after: always; align-content: center; }
    .sheet:last-of-type { page-break-after: auto; }
    .sheet::before { display: none; }
  }
</style>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><g id="qrsym">${qrInner}</g></defs></svg>
  <header class="toolbar">
    <h1>Masa Kartları — ${esc(f.name)}<small>${esc(menuUrl)} · masa ${bas}–${son} · ${cards.length} kart · ${cift ? `${sheets.length / 2} yaprak (arkalı önlü, ${sheets.length} sayfa)` : `${sheets.length} sayfa (tek yüz)`} · A4, 10×15cm, 2 kart/sayfa</small></h1>
    <form method="get">
      <label>Masa</label>
      <input type="number" name="bas" min="1" value="${bas}">
      <span>–</span>
      <input type="number" name="son" min="1" value="${son}">
      <select name="yuz" style="padding:6px 8px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.25);color:#f4f6fb;font-size:13px">
        <option value="cift"${cift ? ' selected' : ''}>Çift yüz (arkalı önlü)</option>
        <option value="tek"${cift ? '' : ' selected'}>Tek yüz</option>
      </select>
      <button type="submit" class="btn-ghost">Uygula</button>
    </form>
    <button class="btn-print" onclick="window.print()">PDF İndir</button>
    <p class="hint">${cift
      ? 'Arkalı önlü: yazıcı ayarında <b>Her iki yüze yazdır</b> + <b>Uzun kenardan çevir</b> seçin — her kartın arkası birebir kendi önüne denk gelir (arka sayfalarda sütunlar bu yüzden yer değiştirir). '
      : ''}Kart ölçüsü 10×15 cm; kesik çizgiler kesim yeridir. "Arka plan grafikleri" açık olmalıdır.</p>
  </header>
  ${sheets.join('\n')}
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
