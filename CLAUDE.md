# QR Dijital Menu Olusturucu — Blueprint

## Amac
Restoran ve kafelerin dijital menusunu olusturup QR kod ile paylasabildigi tek sayfalik uygulama. Sol tarafta menu duzenleyici, sag tarafta canli onizleme. Her menu ogesi icin Fal AI ile yemek gorseli olusturulabilir. QR kod canvas uzerinde uretilir.

## Teknik Gereksinimler
- Tek dosya: `index.html` (inline CSS + JS)
- Tema: Koyu (#0a0a0a arka plan), aksent renk #f59e0b (amber)
- Font: DM Sans (Google Fonts)
- Dil: Turkce
- Framework yok, sadece vanilla HTML/CSS/JS
- localStorage ile menu verisi persistance

## API Anahtari Kurulumu

```js
// index.html icerisinde <script> blogunun en basinda:
// =============================================
// AYAR: Asagidaki degeri kendi Fal AI anahtarinla degistir
// Anahtar almak icin: https://fal.ai/dashboard/keys
// =============================================
const FAL_KEY = 'KEY_BURAYA_GIRIN';
```

### .env.example
```
FAL_KEY=fal_xxxxxxxxxxxxxxxxxxxx
```

## Fal AI Entegrasyonu

### Endpoint
```
POST https://fal.run/fal-ai/nano-banana-2
```

### Headers
```js
{
  "Authorization": `Key ${FAL_KEY}`,
  "Content-Type": "application/json"
}
```

### Request Body (Menu Ogesi Icin)
```js
{
  "prompt": `delicious Turkish ${dishName}, restaurant food photography, top view, warm lighting, wooden table, professional photo, appetizing, high quality`,
  "image_size": "square_hd"
}
```

### Kategori Bazli Prompt Varyantlari
```js
const PHOTO_PROMPTS = {
  "Baslangiclar": "appetizer plate, Turkish meze, elegant presentation, restaurant setting",
  "Ana Yemekler": "main course, Turkish cuisine, generous portion, ceramic plate, restaurant photography",
  "Tatlilar": "Turkish dessert, sweet, beautiful plating, close-up, warm tones",
  "Icecekler": "beverage, Turkish drink, glass, refreshing, cafe setting, soft lighting"
};
// Prompt: `delicious ${dishName}, ${PHOTO_PROMPTS[category]}, professional food photography, 4k`
```

### Response
```json
{
  "images": [{ "url": "https://...", "width": 1024, "height": 1024 }]
}
```

### Hata Yonetimi
- API hatasi: placeholder yemek ikonu goster + kisa hata mesaji
- Loading: kare shimmer skeleton (80x80px menu item boyutunda)
- FAL_KEY girilmemisse: gorsel butonlarini gizleme, tiklaninca uyari toast goster
- Olusturulan gorseller localStorage'a base64 olarak KAYDEDILMESIN, sadece URL saklansin

## Varsayilan Menu Verileri

```js
const DEFAULT_MENU = {
  restaurantName: "Anadolu Sofrasi",
  restaurantTagline: "Geleneksel Tatlar, Modern Sunus",
  categories: [
    {
      name: "Baslangiclar",
      icon: "🥗",
      items: [
        { id: 1, name: "Mercimek Corbasi", description: "Geleneksel kirmizi mercimek corbasi, limon ve kuru nane ile", price: 85, image: null, isPopular: true },
        { id: 2, name: "Humus Tabagi", description: "Tahin, zeytinyagi ve kimyon ile servis", price: 95, image: null, isPopular: false },
        { id: 3, name: "Sigara Boregi", description: "El acmasi yufka, beyaz peynir ve maydanoz ic harci", price: 110, image: null, isPopular: true },
        { id: 4, name: "Atom Tabagi", description: "Acili ezme, susam ezmesi, nar eksisi, ceviz", price: 120, image: null, isPopular: false },
        { id: 5, name: "Cacik", description: "Suzme yogurt, salatalik, nane ve sarimsak", price: 70, image: null, isPopular: false }
      ]
    },
    {
      name: "Ana Yemekler",
      icon: "🥩",
      items: [
        { id: 6, name: "Adana Kebap", description: "El kiymasi kuzu eti, mangal kosede, lavash ve grillenmi domates ile", price: 320, image: null, isPopular: true },
        { id: 7, name: "Iskender Kebap", description: "Ince dilim doner, tereyagli domates sosu, yogurt yatagi uzerinde", price: 340, image: null, isPopular: true },
        { id: 8, name: "Karisik Izgara", description: "Adana, urfa, pirzola, tavuk kanat, kofte — 2 kisilik", price: 580, image: null, isPopular: false },
        { id: 9, name: "Hunkar Begendi", description: "Kusbasi kuzu eti, kozlenmis patlican puresi uzerinde", price: 290, image: null, isPopular: false },
        { id: 10, name: "Tavuk Sis", description: "Marine edilmis tavuk gogus, biber ve sogan ile mangalda", price: 240, image: null, isPopular: false },
        { id: 11, name: "Ali Nazik Kebap", description: "Yogurtlu patlican uzerinde kusbasi kuzu", price: 310, image: null, isPopular: true },
        { id: 12, name: "Kofte Tabagi", description: "Izgarada el yapimi kofte, pilav ve salata ile", price: 260, image: null, isPopular: false },
        { id: 13, name: "Pide — Kiymali", description: "Firin pide, kiymali ic harci, tereyag ile", price: 200, image: null, isPopular: false }
      ]
    },
    {
      name: "Tatlilar",
      icon: "🍮",
      items: [
        { id: 14, name: "Kunefe", description: "Tel kadayif, peynir, antep fistigi ile sicak servis", price: 180, image: null, isPopular: true },
        { id: 15, name: "Baklava (6 dilim)", description: "Antep fistikli, ince yufka, serbetli", price: 220, image: null, isPopular: true },
        { id: 16, name: "Sutlac", description: "Firin sutlac, tarc cin ile", price: 95, image: null, isPopular: false },
        { id: 17, name: "Katmer", description: "Antep usulu, kaymak ve fistik ile", price: 160, image: null, isPopular: false },
        { id: 18, name: "Dondurma (3 Top)", description: "Maras usulu — vanilya, cikolata, antep fistigi", price: 120, image: null, isPopular: false }
      ]
    },
    {
      name: "Icecekler",
      icon: "🥤",
      items: [
        { id: 19, name: "Ayran", description: "Geleneksel kopu kl  u ayran", price: 35, image: null, isPopular: true },
        { id: 20, name: "Turk Kahvesi", description: "Orta sekerli, lokum ile servis", price: 60, image: null, isPopular: false },
        { id: 21, name: "Taze Sikma Portakal", description: "Gunluk taze sikma, 300ml", price: 75, image: null, isPopular: false },
        { id: 22, name: "Salgam Suyu", description: "Acili veya acisiz, Adana usulu", price: 40, image: null, isPopular: false },
        { id: 23, name: "Limonata", description: "Ev yapimi nane limonata", price: 55, image: null, isPopular: false },
        { id: 24, name: "Cay (Bardak)", description: "Demlik cay, ince bel bardak", price: 25, image: null, isPopular: true }
      ]
    }
  ]
};
```

## Veri Yapisi

### Menu Objesi
```js
{
  restaurantName: string,
  restaurantTagline: string,
  themeColor: string,         // Onizleme menu aksent rengi (kullanici secebilir)
  categories: [
    {
      name: string,
      icon: string,           // Emoji
      items: [
        {
          id: number,
          name: string,
          description: string,
          price: number,
          image: string|null,  // Fal AI gorsel URL'i
          isPopular: boolean
        }
      ]
    }
  ]
}
```

## UI Spesifikasyonu

### Genel Layout
```
+--------------------------------------------------+
|  HEADER: "QR Menu Olusturucu" + restoran adi      |
+--------------------------------------------------+
|                                                    |
|  SOL PANEL (Editor)        |  SAG PANEL (Preview)  |
|  %50 genislik              |  %50 genislik         |
|                             |                       |
|  - Restoran Ayarlari       |  +------------------+ |
|  - Kategori Listesi        |  | TELEFON CERCEVE  | |
|  - Menu Ogesi Listesi      |  | Canli Onizleme   | |
|  - Oge Ekleme/Duzenleme    |  |                  | |
|  - Gorsel Olusturma        |  +------------------+ |
|                             |                       |
|                             |  [QR Kod Olustur]     |
+--------------------------------------------------+
```

### Sol Panel — Editor

**Restoran Ayarlari (ust kisim, katlanabilir)**
- Restoran Adi: text input
- Slogan: text input
- Menu Tema Rengi: 6 renk secenegi (amber, kirmizi, yesil, mavi, mor, pembe) — kucuk daireler, tikla sec

**Kategori Yonetimi**
- Kategoriler dikey tab listesi halinde
- Her tab: emoji + kategori adi + oge sayisi badge
- Aktif tab vurgulu
- Alt kisimda "+ Yeni Kategori" butonu
- Kategori silme: kucuk x butonu (en az 1 kategori kalmali)

**Menu Ogesi Listesi (secili kategorinin ogeleri)**
- Her oge satiri:
  ```
  [Gorsel/Placeholder] [Ad + Aciklama] [₺Fiyat] [Populer toggle] [Gorsel Olustur] [Sil]
  ```
- Drag & drop ile siralama (opsiyonel, en azindan yukari/asagi oklari olsun)
- "Populer" toggle: yildiz ikonu, aktifse altin rengi
- "Gorsel Olustur" butonu: kamera ikonu, her ogede ayri
  - Tiklaninca o ogeye ozel Fal AI isteği atar
  - Gorsel gelince kucuk thumbnail gosterir
  - Gorsel varsa buton "Yenile" olarak degisir

**Yeni Oge Ekleme**
- Listenin altinda "+ Yeni Oge Ekle" butonu
- Tiklaninca inline form acar: ad, aciklama, fiyat
- Kaydet/Iptal butonlari

### Sag Panel — Canli Onizleme

**Telefon Cercevesi**
- Mobil cihaz mockup'u (360x640px icerik alani)
- Yuvarlatilmis koseler, ince border
- Iceride gercek bir menu sayfasi render edilecek

**Onizleme Icerigi (telefon icinde)**
- Ust kisim: Restoran adi + slogan (tema renginde)
- Kategoriler: yatay scroll pill butonlari
- Menu ogeleri: kart seklinde
  - Gorsel varsa: sol tarafta kare gorsel (60x60)
  - Sag tarafta: ad (bold) + aciklama (gri, 2 satir max) + fiyat
  - Populer olanlarda: kucuk "Populer" badge
- Her degisiklik anlik olarak onizlemeye yansissin (live preview)

**QR Kod Alani**
- "QR Kod Olustur" butonu
- Tiklaninca: canvas uzerinde QR kod ciz
  - QR icerigi: menuyu encode eden URL (veya basit bir placeholder URL)
  - NOT: Gercek QR encode zor, basit bir gorsel QR pattern ciz (8x8 grid siyah-beyaz piksel pattern yeterli, gercek QR kutuphanesi gerekmez)
  - Alternatif: QR icine restoran adini encode et, basit bir pattern olustur
- QR altinda: "QR kodu indirmek icin tiklayin" metni
- Tiklaninca canvas'i PNG olarak indir

### Responsive
- 1024px alti: editor tam genislik, preview altta
- 768px alti: telefon cercevesi kuculsun (300x540)
- Preview toggle butonu: mobilde editor/preview arasi gecis

### Animasyonlar
- Kategori degisiminde: ogeler fade gecis
- Yeni oge eklendiginde: slide-in animasyonu
- Gorsel yuklendiginde: fade-in
- Populer toggle: yildiz bounce efekti
- QR olusturma: pattern'lar piksel piksel ortaya cikssin (hizli animasyon)
- Onizlemedeki degisiklikler: smooth transition

### Renk Paleti (Editor)
```css
--bg-primary: #0a0a0a;
--bg-secondary: #111111;
--bg-card: #1a1a1a;
--border: #2a2a2a;
--text-primary: #f5f5f5;
--text-secondary: #a0a0a0;
--accent: #f59e0b;
--accent-hover: #d97706;
--popular-badge: #f59e0b;
--delete: #ef4444;
```

### Menu Tema Renk Secenekleri (Onizleme Icin)
```js
const MENU_THEMES = [
  { name: "Amber", color: "#f59e0b", bg: "#fffbeb" },
  { name: "Kirmizi", color: "#ef4444", bg: "#fef2f2" },
  { name: "Yesil", color: "#22c55e", bg: "#f0fdf4" },
  { name: "Mavi", color: "#3b82f6", bg: "#eff6ff" },
  { name: "Mor", color: "#8b5cf6", bg: "#f5f3ff" },
  { name: "Pembe", color: "#ec4899", bg: "#fdf2f8" }
];
```
Onizleme menusunun arka plani acik renk (light theme), menu karti gibi gorunsun. Editor koyu, onizleme acik — kontrast olusturur.

## localStorage Yapisi

```js
// Key: 'qr-menu-data'
// Value: JSON
{
  restaurantName: string,
  restaurantTagline: string,
  themeColor: string,
  categories: [...],         // Tum menu verisi
  lastUpdated: timestamp
}

// Key: 'qr-menu-initialized'
// Value: 'true'
```

## QR Kod Uretimi (Canvas-Based)

Gercek QR encode yerine gorsel olarak ikna edici bir pattern olustur:

```js
function generateQRPattern(canvas, text) {
  const ctx = canvas.getContext('2d');
  const size = 200;  // 200x200 piksel
  const gridSize = 25; // 25x25 hucre
  const cellSize = size / gridSize;

  // Beyaz arka plan
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // QR finder patterns (3 kose)
  drawFinderPattern(ctx, 0, 0, cellSize);
  drawFinderPattern(ctx, (gridSize - 7) * cellSize, 0, cellSize);
  drawFinderPattern(ctx, 0, (gridSize - 7) * cellSize, cellSize);

  // Text'den seed olustur, rastgele ama tutarli pattern ciz
  const seed = hashString(text);
  // Deterministic random fill icin seed kullan
  // ...
}
```

Bu yaklasim gercek QR gibi gorunur ama taranmaz. Gorsel amaclidir.

## Onemli Notlar
- Her editor degisikligi anlik olarak onizlemeye yansimali (reactive)
- Fal AI gorselleri ogelere ozgu — her oge icin ayri istek
- Ayni anda birden fazla gorsel istegi gonderilebilir ama ayni ogede art arda tiklamayi onle (debounce)
- Menu verisi localStorage'dan yuklensin, yoksa DEFAULT_MENU kullanilsin
- Restoran adi ve slogan degistikce onizleme anlik guncellensin
- Fiyat formati: "₺85" (TL simgesi + tam sayi, kusurat varsa goster)
- Minimum 1 kategori ve 1 oge olmali — silme islemlerinde kontrol et
- Onizleme icindeki menu LIGHT THEME olmali (restoran musterisi gorecek), editor DARK THEME

---

## 🎯 3 GÖRÜNÜM ZORUNLULUĞU (ÖNEMLİ)

Bu uygulamayı kurarken **3 farklı view (görünüm)** zorunlu olarak içerecek. Sağ panelde tab'lar ile geçiş:

### View 1: 📱 Düzenleyici / Editör (varsayılan)
- Yukarıda anlatılan ana editör arayüzü
- Sol panel form/ayarlar, sağ panel mini önizleme

### View 2: 🌐 Web Sitesi / Landing Page
- Browser frame (mac-stili: 3 colored dots + URL bar)
- Tam müşteri-yüzlü landing page mockup:
  - **Hero** — büyük başlık, slogan, 2 CTA buton, gradient arka plan
  - **3 Feature** kartı (icon + başlık + açıklama)
  - **Popüler içerik grid** (varsa popular işaretli olanlar otomatik)
  - **İletişim Info** (adres, saat, telefon — 3 kolon)
  - **CTA section** — büyük çağrı + buton
  - **Footer** — copyright + brand

### View 3: 🍽️ Müşteri Görünümü / Tam UI
- Browser frame
- Müşterinin gerçekten kullanacağı tam ekran arayüz
- (Bu uygulamanın asıl ürünü — örn QR menü için tam menü sayfası, randevu için booking sayfası)

### Tab Sistemi (zorunlu)
```html
<div class="view-tabs">
  <button class="view-tab active" onclick="switchView('phone')">📱 Editör</button>
  <button class="view-tab" onclick="switchView('landing')">🌐 Web Sitesi</button>
  <button class="view-tab" onclick="switchView('app')">🎯 Tam UI</button>
</div>
```

### Browser Frame CSS (zorunlu)
```css
.browser-frame {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid #333;
}
.browser-bar {
  background: #2a2a2a; padding: 10px 16px;
  display: flex; align-items: center; gap: 16px;
}
.browser-dots span { width: 12px; height: 12px; border-radius: 50%; }
.browser-dots span:nth-child(1) { background: #ff5f57; }
.browser-dots span:nth-child(2) { background: #febc2e; }
.browser-dots span:nth-child(3) { background: #28c840; }
.browser-url {
  background: #1a1a1a; color: #999; padding: 6px 14px;
  border-radius: 6px; font-size: 12px; flex: 1; text-align: center;
}
```

### Reactive Updates
Her view aynı state'ten render edilmeli — editör'deki değişiklik anında 3 view'da yansımalı.

```js
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');
  if (view === 'landing') renderLanding();
  if (view === 'app') renderApp();
  if (view === 'phone') renderPreview();
}
```

### Landing Page İçerik Üretimi
Müşteri sektörüne göre AI ile üretilebilir ya da template'le:
- Restoran → "Geleneksel Lezzet, Modern Sunuş" + 3 değer önermesi
- Diş kliniği → "Profesyonel Diş Hizmeti" + uzmanlık alanları
- Salon → "Modern Saç & Güzellik" + hizmetler
- Otel → "Konfor + Lüks" + oda tipleri

### Tab Arası Geçiş Animasyonu (opsiyonel)
Smooth opacity transition (0.2s).

