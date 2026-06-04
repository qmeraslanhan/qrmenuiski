# Projects

Bu klasörde portal'ın her bir alt projesinin **kendi dünyası** vardır:
HTML şablonları, DB şeması, proje-spesifik tipler, yardımcı kodlar.

```
projects/
├── qr-menu/                 # İSKİ tesisleri dijital menü sistemi
│   ├── meta.ts              # Dashboard'da nasıl görünür (slug, başlık, etiketler)
│   ├── html/                # HTML şablonları (webpack asset/source ile bundle'a girer)
│   ├── db-schema.ts         # ensureInit — tabloları idempotent yaratır
│   └── README.md
│
└── _template/               # Yeni proje başlangıç noktası
    └── README.md
```

## Yeni proje eklemek

```bash
# 1. Template'i kopyala
cp -r src/projects/_template src/projects/<slug>

# 2. meta.ts'i doldur
$EDITOR src/projects/<slug>/meta.ts

# 3. (Opsiyonel) DB şeması ekle
$EDITOR src/projects/<slug>/db-schema.ts

# 4. Next.js route handler ekle (THIN handler)
mkdir src/app/<slug>
# içine: route.ts → serveHtml('<slug>/index.html')

# 5. Registry'ye ekle
$EDITOR src/lib/projects.ts
# import meta from '@/projects/<slug>/meta';
# PROJECTS array'ine ekle

# 6. serve-html.ts'e HTML import'larını ekle
$EDITOR src/lib/serve-html.ts

# 7. Deploy
npm run cf:deploy
```

## Çakışmayı önleyen kurallar

| Kategori | Kural |
|---|---|
| Route prefix | Her proje `/<slug>/...` altında |
| API prefix | `/<slug>/api/...` (rewrite ile kısa alias eklenebilir) |
| DB tablo | Yeni projeler için: `<slug>_<table>` prefix önerilir |
| R2 klasörü | `<slug>/...` altına yaz |
| Asset path | `public/img/<slug>/...` |
| Env vars | Generic olanlar paylaşılır (R2_*, ADMIN_PASSWORD); proje-spesifik için prefix kullan |

## Shared kaynaklar

- `src/lib/d1.ts` — D1 wrapper (proje-agnostik)
- `src/lib/r2.ts` — R2 upload (S3 API)
- `src/lib/auth.ts` — Auth helpers (bcrypt, rate limit)
- `src/lib/serve-html.ts` — HTML servisi
- `src/components/` — Shared React UI (Logos, butonlar, footer)
- `src/app/globals.css` — Ortak design tokens (palette, animasyonlar)
