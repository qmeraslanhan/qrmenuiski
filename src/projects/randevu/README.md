# Randevu — Berber & Kuaför Randevu Sistemi

Çoklu-salon, dönem değil **gün/saat slotu** bazlı online randevu sistemi.
Müşteri hizmet + (varsa) usta + gün + saat seçer → talep **onay bekleyen** olarak düşer.
Yönetim panelinden onaylanır/reddedilir. Çakışan saatler sunucu tarafında engellenir.

**Randevu almak üye girişi gerektirir.** Vatandaş önce üye olur/giriş yapar; randevu
alınınca e-posta ile onay (Resend) gönderilir.

## Akış

```
/randevu                       → salon listesi (salonlar.html)
/randevu/salon/<slug>          → randevu alma akışı (randevu.html) — üye girişi şart
/randevu/uye                   → üye giriş + kayıt (uye.html)
/randevu/hesabim               → üyenin randevuları (hesabim.html)
/randevu/login                 → yönetim girişi (login.html)
/randevu/admin                 → yönetim paneli (admin.html)
```

## API

Public:
- `GET  /randevu/api/salons`                      — aktif salonlar
- `GET  /randevu/api/salons/<slug>`               — salon + hizmetler + ustalar
- `GET  /randevu/api/salons/<slug>/slots?date=&service_id=&staff_id=` — uygun saatler
- `POST /randevu/api/appointments`                — randevu talebi (pending) — **üye Bearer token şart**, sonrasında onay maili gider

Üye (member):
- `POST /randevu/api/member/register`  — {name,email,phone,password} → token
- `POST /randevu/api/member/login`     — {email,password} → token
- `POST /randevu/api/member/logout`
- `GET  /randevu/api/member/me`        — üye + kendi randevuları (Bearer member token)

## E-posta (Resend)

`src/projects/randevu/email.ts` — Resend API ile gönderir. Secret gerekli:

```bash
echo "re_xxx" | npx wrangler secret put RESEND_API_KEY
# opsiyonel gönderen (varsayılan noreply@omeraslanhan.com):
echo "İSKİ Randevu <noreply@omeraslanhan.com>" | npx wrangler secret put RESEND_FROM
```

Resend'de `omeraslanhan.com` domaini DNS (SPF/DKIM) ile doğrulanmalı. Key yoksa
randevu yine başarılı olur, mail sessizce atlanır (`mailed:false` döner).

Admin (Bearer token — portal `ADMIN_PASSWORD` ile ortak):
- `POST   /randevu/api/admin/login` · `POST /randevu/api/admin/logout`
- `GET/POST     /randevu/api/admin/salons`
- `PATCH/DELETE /randevu/api/admin/salons/<id>`
- `GET/POST     /randevu/api/admin/salons/<id>/services`
- `PATCH/DELETE /randevu/api/admin/services/<id>`
- `GET/POST     /randevu/api/admin/salons/<id>/staff`
- `PATCH/DELETE /randevu/api/admin/staff/<id>`
- `GET          /randevu/api/admin/appointments?status=&date=&salon_id=`
- `PATCH/DELETE /randevu/api/admin/appointments/<id>`  (status: pending|approved|rejected|cancelled)

## Veritabanı (D1, `randevu_` prefix)

- `randevu_salons`   — işletme + çalışma saatleri (`open_time`,`close_time`), `slot_minutes`, `work_days` (0=Paz..6=Cmt)
- `randevu_services` — hizmet + `duration_min` + `price`
- `randevu_staff`    — usta (opsiyonel)
- `randevu_appointments` — randevular (`service_name`/`duration_min` snapshot'lı), `status`, `member_id`, `email`
- `randevu_members` — üyeler (email benzersiz, bcrypt şifre) + `randevu_member_sessions` (token)

Auth tabloları (`sessions`, `login_attempts`) qr-menu ile paylaşılır; `ensureRandevuInit`
bunları da idempotent yaratır.

## Slot mantığı (`slots.ts`)

Uygun başlangıç saatleri = `[open, close)` aralığında `slot_minutes` adımlarla üretilir,
seçilen hizmet süresi kadar yer kaplar, `pending`+`approved` randevularla çakışanlar elenir.
Usta seçiliyse uygunluk usta bazında, değilse salon bazında hesaplanır.
Aynı gün ise geçmiş saatler gizlenir (İstanbul = UTC+3).

## Notlar

- Görseller URL ile verilir (R2 upload yok) — `image_url` alanı.
- Tasarım: public sayfalar lacivert+altın (qr-menu ile kardeş), admin paneli portal cream+mavi.
