# QR Menü Sistemi

İSKİ Sosyal İşler Şube Müdürlüğü tesisleri için çoklu-tesis dijital menü.

## URL'ler

- Tesis listesi: `/qr-menu` → `html/tesisler.html`
- Admin panel: `/qr-menu/admin` → `html/admin.html`
- Login: `/qr-menu/login` → `html/login.html`
- Tek menü: `/qr-menu/menu/<slug>` → `html/menu.html`
- Yazdır: `/qr-menu/print/<slug>` → `html/print-menu.html`

## Şema (Cloudflare D1)

`db-schema.ts` içinde tanımlı. Tablolar: `facilities`, `categories`, `products`,
`users`, `user_facilities`, `sessions`, `session_facilities`, `login_attempts`.

İlk istek geldiğinde `ensureInit()` idempotent çalışır.

## Görsel depo (Cloudflare R2)

- Bucket: `qrmenu-hosting`
- Public CDN: `https://cdn.omeraslanhan.com`
- Klasörler: `products/`, `logos/`

## Kullanılan env vars

- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`
- `ADMIN_PASSWORD`

## Migration / yeni kolon eklemek

`db-schema.ts` içindeki `applySchema` listesine yeni statement ekle. D1 üretimi
elle güncellemek için:

```bash
npx wrangler d1 execute qrmenu-db --remote --command "ALTER TABLE products ADD COLUMN ..."
```
