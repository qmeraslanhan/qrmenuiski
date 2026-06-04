# [Proje Adı]

Bu klasörü `src/projects/<senin-slug>/` olarak kopyala, içeriği güncelle.

## Bu projede ne var?

- `meta.ts` — Dashboard kartı (zorunlu)
- `html/` — HTML şablonlar (varsa)
- `db-schema.ts` — DB tabloları (D1 kullanıyorsa)
- `README.md` — bu dosya

## Setup adımları

1. `meta.ts`'i kendi proje bilgilerinle doldur
2. `src/app/<slug>/route.ts` oluştur, `serveHtml('<slug>/index.html')` çağır
3. `src/lib/projects.ts`'e meta import'unu ekle
4. (HTML varsa) `src/lib/serve-html.ts`'e import + map kaydı ekle
5. (DB varsa) `db-schema.ts` yaz, `ensureInit()` çağır
6. `npm run cf:deploy`
