# İkramlık & Sipariş Takip Sistemi

Kurumsal ikram siparişlerini girer, kaynağına göre (**İç Üretim Ambarı** / **İhale Firması**)
yönlendirir ve **zamanında hazır olmasını** renk kodu + canlı geri sayım + alarm ile takip eder.

> Tasarım kaynağı: `Downloads/design_handoff_siparis_takip/` (README + `app/*.jsx` + `style.css`).
> Bu modül o prototipi portal mimarisine (Cloudflare Workers + Next.js + D1) uyarlar.

## Roller

- **Yönetici** — sipariş girer, tüm siparişleri + ihale havuzunu izler, durum ilerletir.
- **Ambar Çalışanı** — yalnızca İç Üretim Ambarı'na atanan siparişleri görür, durum günceller.

## Dosyalar

| Dosya | İş |
|---|---|
| `meta.ts` | Dashboard kartı (slug `siparis-takip`, başlık, etiket, ikon `siparis`). |
| `db-schema.ts` | `siparis_takip_*` tabloları (idempotent `ensureSiparisInit`) + ilk seed. |
| `timing.ts` | `orderTiming` / hazır-olma / alarm / renk seviyesi (data.jsx ile birebir). |
| `bot-notifier.ts` | Alarm bildirimi — şimdilik console + DB log; Telegram/WhatsApp için TODO. |
| `html/app.html` | Tek sayfa SPA (vanilla JS) — tüm ekranlar; `/siparis-takip/api/*` çağırır. |

## Route'lar

- `GET /siparis-takip` → `html/app.html`
- `… /siparis-takip/api/*` → bkz. `src/app/siparis-takip/api/` (Adım 3)

## İş kuralları (özet)

1. `hazir_olma_ts = etkinlik_ts − 1 saat` (otomatik).
2. İhale firması ise ilgili `ihale_kalemleri.kalan_miktar` sipariş kalemi kadar otomatik düşülür
   (atomik); stok yetersizse **422**.
3. Renk: tamamlanmış→teal · hazır-olmaya ≤1sa/geçmiş→kırmızı · ≤3sa→sarı · üstü→yeşil.
4. **Alarm**: etkinliğe 2 saat kala (teslimata 1 saat) hâlâ "Hazır" değilse → kırmızı uyarı + bildirim + `botNotifier`.
5. Durum tek yönlü: `Beklemede → Hazırlanıyor → Hazır → Yola Çıktı → Teslim Edildi`.

## Tablo prefix'i

Çakışma kuralı gereği tüm tablolar `siparis_takip_` ön ekli. `sessions` rol-tabanlı oturum için
proje-özel (`siparis_takip_sessions`).

---

## Lokal çalıştırma & dağıtım

> Bu modül **Cloudflare D1** binding'i (`DB`) kullanır. Saf `next dev` bu binding'i sağlamaz;
> bu yüzden yerelde **workerd** üzerinden çalıştırılır (qr-menu/randevu ile aynı).

```bash
# 1) Bağımlılıklar (repo kökünde bir kez)
npm install

# 2) Yerelde çalıştır (build + workerd + YEREL D1 — .wrangler/state altında)
npm run cf:preview
#   → http://localhost:8787/siparis-takip

# Sadece derleme kontrolü:
npm run cf:build
```

İlk istek geldiğinde `ensureSiparisInit()` tabloları yaratır ve **otomatik seed** yükler
(2 kullanıcı, 5 ihale kalemi, 8 sipariş). Ayrı bir seed komutu gerekmez.

**Demo giriş:** Rol seçip "… olarak gir" — şifre yok (prototip demo'su).
Yönetici = Selim Aktaş · Ambar = Hakan Demir (seed'den).

### .env / secret'lar

| Değişken | Zorunlu mu | Ne için |
|---|---|---|
| `CRON_SECRET` | Alarm cron'u için | `…/api/cron/alarm-scan?key=...` korumalı tarayıcı. Yoksa endpoint **503** döner. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Opsiyonel (ileride) | `bot-notifier.ts` içindeki TODO açılınca gerçek bot bildirimi. |

```bash
# Üretim secret'ı (Cloudflare):
echo "uzun-rastgele-deger" | npx wrangler secret put CRON_SECRET
# Yerel preview için: $env:CRON_SECRET="..." (PowerShell) ile başlat
```

### Alarm tarayıcı (cron) bağlama

`alarmScheduler` (her dakika) eşdeğeri sunucu tarafında `GET /siparis-takip/api/cron/alarm-scan?key=$CRON_SECRET`:
- Mevcut **qrmenu-cron** worker'ına (Cloudflare Cron Trigger) bu URL eklenebilir, veya
- cron-job.org gibi bir dış zamanlayıcı dakikalık çağırır.

Tarayıcı, etkinliğe ≤2 saat kalan ve hâlâ "Hazır" olmayan siparişler için **bir kez** alarm
bildirimi açar ve `botNotifier`'ı tetikler (sipariş "Hazır" olunca işaret temizlenir).
Arayüzdeki canlı alarm bandı + bot önizleme kartı ise client'ta anlık hesaplanır (cron gerekmez).

### Dağıtım (canlı)

```bash
.\deploy.ps1 "feat: siparis-takip ikramlik modulu"
# (temizler → build → Cloudflare'a deploy). git push tek başına canlıyı GÜNCELLEMEZ.
```

Dashboard kartı `getSystemStatuses` "yokluk=aktif" kuralıyla otomatik **Aktif** gelir;
gizli yönetici panelinden pasife alınabilir.
