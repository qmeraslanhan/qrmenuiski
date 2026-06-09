// ─────────────────────────────────────────────────────────────────
// İkramlık & Sipariş Takip — D1 şeması + ilk seed.
// İlk istekte ensureSiparisInit() tabloları idempotent yaratır ve
// tablolar boşsa tasarım prototipindeki (data.jsx) seed verisini yükler.
//
// Tüm tablolar `siparis_takip_` prefix'li (çakışma önleme kuralı).
// Zaman alanları epoch-ms (INTEGER) — prototiple birebir matematik için.
// ─────────────────────────────────────────────────────────────────
import { db, applySchema } from '@/lib/d1';

const MS_SA = 60 * 60 * 1000;

// Tedarik kodları (DB'de saklanır; API/arayüz görünen etikete çevirir)
export const TEDARIK_KOD = {
  AMBAR: 'IC_URETIM_AMBARI',
  IHALE: 'IHALE_FIRMASI',
} as const;
export const TEDARIK_ETIKET: Record<string, string> = {
  IC_URETIM_AMBARI: 'İç Üretim Ambarı',
  IHALE_FIRMASI: 'İhale Firması',
};

// Durum akışı (Türkçe değerler kanoniktir — prototiple aynı)
export const DURUM = {
  BEKLEMEDE: 'Beklemede',
  HAZIRLANIYOR: 'Hazırlanıyor',
  HAZIR: 'Hazır',
  YOLDA: 'Yola Çıktı',
  TESLIM: 'Teslim Edildi',
} as const;
export const DURUM_SIRA = [DURUM.BEKLEMEDE, DURUM.HAZIRLANIYOR, DURUM.HAZIR, DURUM.YOLDA, DURUM.TESLIM];
export const TAMAMLANMIS = [DURUM.HAZIR, DURUM.YOLDA, DURUM.TESLIM];

let initialized = false;

export async function ensureSiparisInit(): Promise<void> {
  if (initialized) return;
  await applySchema([
    // Kullanıcılar (rol: yonetici | ambar) — demo'da şifresiz, üretimde sifre_hash
    `CREATE TABLE IF NOT EXISTS siparis_takip_kullanicilar (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ad         TEXT    NOT NULL,
      rol        TEXT    NOT NULL,
      unvan      TEXT,
      bas        TEXT,
      sifre_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // İhale sözleşme kalemleri — kalan_miktar otomatik düşülür
    `CREATE TABLE IF NOT EXISTS siparis_takip_ihale_kalemleri (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      kalem           TEXT    NOT NULL,
      birim           TEXT    NOT NULL,
      firma           TEXT    NOT NULL,
      sozlesme_miktari REAL   NOT NULL DEFAULT 0,
      kalan_miktar    REAL    NOT NULL DEFAULT 0
    )`,

    // Siparişler
    `CREATE TABLE IF NOT EXISTS siparis_takip_siparisler (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      kod              TEXT    NOT NULL UNIQUE,
      talep_eden_birim TEXT    NOT NULL,
      etkinlik_ts      INTEGER NOT NULL,
      hazir_olma_ts    INTEGER NOT NULL,
      tedarik_turu     TEXT    NOT NULL,
      durum            TEXT    NOT NULL DEFAULT 'Beklemede',
      atanan           TEXT,
      note             TEXT,
      olusturan        TEXT,
      olusturma_ts     INTEGER NOT NULL,
      alarm_fired      INTEGER NOT NULL DEFAULT 0
    )`,

    // Sipariş kalemleri (1-N)
    `CREATE TABLE IF NOT EXISTS siparis_takip_siparis_kalemleri (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      siparis_id     INTEGER NOT NULL REFERENCES siparis_takip_siparisler(id) ON DELETE CASCADE,
      ad             TEXT    NOT NULL,
      miktar         REAL    NOT NULL DEFAULT 0,
      birim          TEXT    NOT NULL,
      ihale_kalem_id INTEGER REFERENCES siparis_takip_ihale_kalemleri(id)
    )`,

    // Bildirim / alarm log
    `CREATE TABLE IF NOT EXISTS siparis_takip_bildirimler (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tip        TEXT    NOT NULL,
      baslik     TEXT    NOT NULL,
      alt        TEXT,
      siparis_id INTEGER,
      ts         INTEGER NOT NULL
    )`,

    // Rol-tabanlı oturum (proje-özel)
    `CREATE TABLE IF NOT EXISTS siparis_takip_sessions (
      token      TEXT    PRIMARY KEY,
      rol        TEXT    NOT NULL,
      user_id    INTEGER,
      ad         TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_st_kalem_siparis ON siparis_takip_siparis_kalemleri(siparis_id)`,
    `CREATE INDEX IF NOT EXISTS idx_st_siparis_durum ON siparis_takip_siparisler(durum)`,
    `CREATE INDEX IF NOT EXISTS idx_st_bildirim_ts ON siparis_takip_bildirimler(ts)`,
    `CREATE INDEX IF NOT EXISTS idx_st_sessions_exp ON siparis_takip_sessions(expires_at)`,
  ]);

  await seedIfEmpty();
  initialized = true;
}

async function count(table: string): Promise<number> {
  const r = await db.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number((r.rows[0] as any).n);
}

// data.jsx → seedOrders/seedTender ile birebir. Etkinlik zamanları init anına
// göre offset'lenir ki panel ilk açılışta yeşil/sarı/kırmızı durumları bir arada
// göstersin. (Seed yalnızca tablolar boşken bir kez çalışır.)
async function seedIfEmpty(): Promise<void> {
  // 1) Kullanıcılar
  if ((await count('siparis_takip_kullanicilar')) === 0) {
    const users = [
      ['Selim Aktaş', 'yonetici', 'İkram Koordinatörü', 'SA'],
      ['Hakan Demir', 'ambar', 'Ambar Personeli', 'HD'],
    ];
    for (const [ad, rol, unvan, bas] of users) {
      await db.execute({
        sql: 'INSERT INTO siparis_takip_kullanicilar (ad, rol, unvan, bas) VALUES (?, ?, ?, ?)',
        args: [ad, rol, unvan, bas],
      });
    }
  }

  // 2) İhale kalemleri — sırayı koru (sipariş kalemleri index ile bağlanır)
  let tenderIds: number[] = [];
  if ((await count('siparis_takip_ihale_kalemleri')) === 0) {
    const tender: [string, string, string, number, number][] = [
      ['Şişe Su 0.5L', 'adet', 'Yıldız Catering A.Ş.', 5000, 3180],
      ['Kuru Pasta', 'kg', 'Yıldız Catering A.Ş.', 800, 512],
      ['Poşet Çay', 'paket', 'Bereket Gıda Ltd.', 1200, 690],
      ['Meşrubat (Kutu)', 'kutu', 'Bereket Gıda Ltd.', 3000, 1740],
      ['Tabak/Servis Seti', 'set', 'Yıldız Catering A.Ş.', 600, 95],
    ];
    for (const [kalem, birim, firma, soz, kalan] of tender) {
      const ins = await db.execute({
        sql: 'INSERT INTO siparis_takip_ihale_kalemleri (kalem, birim, firma, sozlesme_miktari, kalan_miktar) VALUES (?, ?, ?, ?, ?)',
        args: [kalem, birim, firma, soz, kalan],
      });
      tenderIds.push(Number(ins.lastInsertRowid));
    }
  } else {
    const r = await db.execute('SELECT id FROM siparis_takip_ihale_kalemleri ORDER BY id');
    tenderIds = (r.rows as any[]).map((x) => Number(x.id));
  }
  // tenderId etiketi ("t1".."t5") → gerçek DB id
  const tIdx = (t: string) => tenderIds[Number(t.slice(1)) - 1];

  // 3) Siparişler + kalemleri
  if ((await count('siparis_takip_siparisler')) === 0) {
    const now = Date.now();
    const at = (saat: number) => now + saat * MS_SA;
    const A = TEDARIK_KOD.AMBAR;
    const I = TEDARIK_KOD.IHALE;

    type SeedKalem = { ad: string; miktar: number; birim: string; t?: string };
    type SeedOrder = {
      birim: string; saat: number; tedarik: string; durum: string; atanan: string;
      note: string; kalemler: SeedKalem[];
    };

    const orders: SeedOrder[] = [
      { birim: 'İl Sağlık Müdürlüğü', saat: 6.2, tedarik: A, durum: DURUM.HAZIRLANIYOR, atanan: 'Hakan Demir',
        note: '2. kat toplantı salonu. Vejetaryen 4 kişi.',
        kalemler: [{ ad: 'Çay (semaver)', miktar: 60, birim: 'bardak' }, { ad: 'Açık büfe kahvaltı', miktar: 25, birim: 'kişi' }] },
      { birim: 'Valilik Özel Kalem', saat: 2.4, tedarik: A, durum: DURUM.HAZIRLANIYOR, atanan: 'Hakan Demir',
        note: 'Protokol konukları için.',
        kalemler: [{ ad: 'Pasta tabağı', miktar: 40, birim: 'tabak' }, { ad: 'Türk kahvesi', miktar: 40, birim: 'fincan' }] },
      { birim: 'Basın ve Halkla İlişkiler', saat: 1.45, tedarik: A, durum: DURUM.BEKLEMEDE, atanan: 'Hakan Demir',
        note: 'Basın toplantısı — fuaye alanı.',
        kalemler: [{ ad: 'Soğuk sandviç', miktar: 30, birim: 'adet' }, { ad: 'Şişe su 0.5L', miktar: 30, birim: 'adet' }] },
      { birim: 'İnsan Kaynakları Daire Bşk.', saat: 0.6, tedarik: A, durum: DURUM.BEKLEMEDE, atanan: 'Hakan Demir',
        note: 'Acil — üst yazı bugün geldi.',
        kalemler: [{ ad: 'İkindi çayı + kurabiye', miktar: 18, birim: 'kişi' }] },
      { birim: 'Strateji Geliştirme Bşk.', saat: 5.0, tedarik: I, durum: DURUM.BEKLEMEDE, atanan: 'Yıldız Catering A.Ş.',
        note: 'Tam gün çalıştay, 2 mola.',
        kalemler: [{ ad: 'Şişe Su 0.5L', miktar: 120, birim: 'adet', t: 't1' }, { ad: 'Kuru Pasta', miktar: 15, birim: 'kg', t: 't2' }] },
      { birim: 'Bilgi İşlem Daire Bşk.', saat: 3.2, tedarik: I, durum: DURUM.HAZIRLANIYOR, atanan: 'Bereket Gıda Ltd.',
        note: 'Sunucu göçü ekibi, gece vardiyası.',
        kalemler: [{ ad: 'Poşet Çay', miktar: 50, birim: 'paket', t: 't3' }, { ad: 'Meşrubat (Kutu)', miktar: 80, birim: 'kutu', t: 't4' }] },
      { birim: 'Çevre ve Şehircilik İl Müd.', saat: -0.3, tedarik: A, durum: DURUM.YOLDA, atanan: 'Hakan Demir',
        note: 'Saha denetim ekibi.',
        kalemler: [{ ad: 'Öğle yemeği kumanya', miktar: 45, birim: 'paket' }] },
      { birim: 'Kültür ve Turizm Müd.', saat: 8.5, tedarik: A, durum: DURUM.BEKLEMEDE, atanan: 'Hakan Demir',
        note: 'Sergi açılışı, akşam programı.',
        kalemler: [{ ad: 'Açılış kokteyli', miktar: 120, birim: 'kişi' }, { ad: 'Limonata', miktar: 120, birim: 'bardak' }] },
    ];

    let kod = 1042;
    const olusturmaTs = now - 3 * MS_SA;
    for (const o of orders) {
      const eventTs = at(o.saat);
      const ins = await db.execute({
        sql: `INSERT INTO siparis_takip_siparisler
              (kod, talep_eden_birim, etkinlik_ts, hazir_olma_ts, tedarik_turu, durum, atanan, note, olusturan, olusturma_ts)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ['SP-' + kod++, o.birim, eventTs, eventTs - MS_SA, o.tedarik, o.durum, o.atanan, o.note, 'Selim Aktaş', olusturmaTs],
      });
      const sid = Number(ins.lastInsertRowid);
      for (const k of o.kalemler) {
        await db.execute({
          sql: 'INSERT INTO siparis_takip_siparis_kalemleri (siparis_id, ad, miktar, birim, ihale_kalem_id) VALUES (?, ?, ?, ?, ?)',
          args: [sid, k.ad, k.miktar, k.birim, k.t ? tIdx(k.t) : null],
        });
      }
    }
  }
}
