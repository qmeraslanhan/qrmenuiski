# İSKİ Sosyal İşler Şube Müdürlüğü — Dijital Portal

Çoklu-proje portalı. `omeraslanhan.com` üzerinde Cloudflare Workers'da çalışır.
Şu an aktif: **QR Menü Sistemi**. Gelecekte yeni alt projeler buraya eklenir.

---

## Stack

| Katman | Teknoloji |
|---|---|
| Host | **Cloudflare Workers** (OpenNext adapter ile Next.js 15 App Router) |
| DB | **Cloudflare D1** (binding adı: `DB`, database adı: `qrmenu-db`) |
| Storage | **Cloudflare R2** (bucket: `qrmenu-hosting`, public CDN: `cdn.omeraslanhan.com`) |
| Auth | bcryptjs (kendi rate-limit'li session sistemi) |
| Frontend | Tailwind 3 (build) + DM Sans/Playfair/Cinzel + saf HTML şablonları |
| Domain | Cloudflare DNS (omeraslanhan.com + cdn alt domain'i) |

Vercel, Turso ve Cloudinary'den 2026-06-03/04'te tamamen geçildi.
Eski izler bu repodan temizlenmiş durumda.

---

## Klasör mimarisi

```
src/
├── app/                     # Next.js routing (thin handlers)
│   ├── page.tsx             # Dashboard (proje listesi)
│   ├── layout.tsx
│   ├── globals.css          # Ortak design tokens (cream + İSKİ blue)
│   ├── not-found.tsx
│   └── qr-menu/             # QR menü için route'lar ve API endpoint'leri
│       ├── route.ts         # /qr-menu → tesisler.html
│       ├── admin/route.ts, login/route.ts, menu/[slug]/route.ts, ...
│       └── api/
│           ├── menu/        # public: tesisler + tek menü
│           ├── admin/       # auth-gated CRUD
│           └── health/
│
├── projects/                # ⭐ Her proje kendi dünyasında
│   ├── README.md            # Yeni proje ekleme rehberi
│   ├── qr-menu/
│   │   ├── meta.ts          # Dashboard kartı bilgisi (slug, başlık, etiket, status)
│   │   ├── html/            # 5 HTML şablonu (webpack `asset/source` ile bundle'a girer)
│   │   │   ├── tesisler.html
│   │   │   ├── admin.html
│   │   │   ├── login.html
│   │   │   ├── menu.html
│   │   │   └── print-menu.html
│   │   ├── db-schema.ts     # ensureInit — qr-menu tablolarını idempotent yaratır
│   │   └── README.md
│   └── _template/           # Yeni proje için boilerplate (README + meta.ts.example)
│
├── lib/                     # Tüm projeler ortak
│   ├── d1.ts                # Generic D1 wrapper + applySchema yardımcısı
│   ├── db.ts                # Backward-compat barrel (eski route'lar buradan import eder)
│   ├── r2.ts                # R2 upload (aws4fetch ile S3 API)
│   ├── auth.ts              # Session + rate limit + bcrypt
│   ├── serve-html.ts        # HTML servisi (bundle'dan)
│   └── projects.ts          # Project registry (her proje meta'sını burada import eder)
│
├── components/              # Shared React UI
│   ├── Logos.tsx            # İSKİ + İBB blok (light/dark variant)
│   ├── TopBackButton.tsx
│   └── PortalFooter.tsx
│
└── html.d.ts                # `*.html` modülleri için TS tipi

public/
├── favicon.svg
└── img/
    ├── iski-logo.png
    └── ibb-mavi.png
```

---

## Cloudflare bindings (`wrangler.toml`)

- `DB` → D1 database `qrmenu-db` (database_id: `22f66b28-06bd-49a2-9c74-43f52eec085f`)
- `ASSETS` → static assets

## Secrets (wrangler secret put ile yüklü)

- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`
- `ADMIN_PASSWORD`

---

## Build & Deploy

```bash
# Tek komutla: commit + push + deploy
.\deploy.ps1 "commit mesajın"
# veya
npm run deploy "mesaj"

# Sadece build:
npm run cf:build

# Sadece deploy (build dahil, git'e dokunmaz):
npm run cf:deploy
```

**Önemli**: Cloudflare'a auto-deploy YOK. `git push` alone canlıyı güncellemez.
Canlıya çıkmak için açık `cf:deploy` çağrısı şart (yukarıdaki `deploy.ps1` ikisini birden yapar).

## DB sorguları (üretim D1)

```bash
npx wrangler d1 execute qrmenu-db --remote --command "SELECT * FROM facilities"
npx wrangler d1 execute qrmenu-db --remote --file=migration.sql
npx wrangler d1 export qrmenu-db --remote --output=backup.sql
```

## Secret güncelleme

```bash
echo "yeni-değer" | npx wrangler secret put SECRET_ADI
# Sonra redeploy: npm run cf:deploy
```

---

## Yeni proje eklemek (5-10 dk)

`src/projects/README.md`'de detaylı adımlar var. Özet:

1. `cp -r src/projects/_template src/projects/<slug>`
2. `meta.ts`'i doldur
3. `src/app/<slug>/route.ts` ekle (thin handler)
4. (HTML varsa) `src/lib/serve-html.ts`'e import ekle
5. (DB varsa) `db-schema.ts` yaz
6. `src/lib/projects.ts`'e meta import'unu ekle
7. `npm run deploy "mesaj"`

Dashboard otomatik olarak yeni projeyi listeler.

## Çakışma önleme kuralları

| Kategori | Kural |
|---|---|
| Route prefix | Her proje `/<slug>/...` altında |
| API prefix | `/<slug>/api/...` zorunlu (rewrite ile kısa alias eklenebilir ama edge-case'ler var) |
| DB tabloları | Yeni projeler için `<slug>_<table>` prefix kullan (qr-menu tarihsel sebepten prefix'siz) |
| R2 klasörü | `<slug>/...` altına yaz |
| Asset path | `public/img/<slug>/...` (paylaşılan logolar ortakta) |
| Dynamic segment isimleri | Aynı seviyede tutarlı olmalı: `[id]` ile `[fid]` yan yana **olamaz** — Lambda crashloop |

---

## Canlı URL'ler

- **Portal**: https://omeraslanhan.com
- **QR menü**: https://omeraslanhan.com/qr-menu
- **Yönetim**: https://omeraslanhan.com/qr-menu/admin
- **CDN**: https://cdn.omeraslanhan.com (R2 görselleri)
- **Repo**: https://github.com/qmeraslanhan/qrmenuiski
- **Test (workers.dev fallback)**: https://qrmenu.qmeraslanhan.workers.dev

## Cloudflare paneller

- Worker: https://dash.cloudflare.com/5103f172a8548a43c52593ca74cb0ee4/workers/services/view/qrmenu
- R2 bucket: https://dash.cloudflare.com/5103f172a8548a43c52593ca74cb0ee4/r2/default/buckets/qrmenu-hosting
- D1: https://dash.cloudflare.com/5103f172a8548a43c52593ca74cb0ee4/workers/d1/databases

---

## Tasarım sistemi

İki sayfa kardeşçe ama farklı kişilik:

- **Dashboard (`/`)**: warm cream (`#F5F1E8`) + İSKİ mavi accent (`#0F4C81`), Playfair serif, sade sıkılık
- **QR menü (`/qr-menu`)**: koyu lacivert (`#0B1E3F`) + altın (`#C9A961`), Cinzel başlık, Osmanlı süsleme arka plan, kart başı altın monogram badge

Ortak DNA: İSKİ + İBB logoları üstte ortada, magnetic arrow hover, stagger fade-up animasyon, `prefers-reduced-motion` desteği.
