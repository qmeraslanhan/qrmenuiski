// ─────────────────────────────────────────────────────────────────
// Sipariş & ihale veri katmanı — sorgular, serileştirme ve iş kuralları.
// Route handler'lar buradan çağırır (ince tutulur).
// ─────────────────────────────────────────────────────────────────
import { db, getDB } from '@/lib/d1';
import { MS } from './timing';
import {
  DURUM, DURUM_SIRA, TEDARIK_KOD, TEDARIK_ETIKET,
} from './db-schema';
import type { SessionUser } from './auth';

export type ApiKalem = { id: number; ad: string; miktar: number; birim: string; tenderId: number | null };
export type ApiOrder = {
  id: number; kod: string; birim: string; eventTs: number; hazirOlmaTs: number;
  tedarik: string; tedarikKod: string; durum: string; atanan: string; note: string;
  olusturan: string; olusturmaTs: number; alarmFired: boolean; kalemler: ApiKalem[];
};

function serializeOrder(o: any, kalemler: any[]): ApiOrder {
  return {
    id: Number(o.id),
    kod: o.kod,
    birim: o.talep_eden_birim,
    eventTs: Number(o.etkinlik_ts),
    hazirOlmaTs: Number(o.hazir_olma_ts),
    tedarik: TEDARIK_ETIKET[o.tedarik_turu] || o.tedarik_turu,
    tedarikKod: o.tedarik_turu,
    durum: o.durum,
    atanan: o.atanan || '',
    note: o.note || '',
    olusturan: o.olusturan || '',
    olusturmaTs: Number(o.olusturma_ts),
    alarmFired: Number(o.alarm_fired) === 1,
    kalemler: (kalemler || []).map((k) => ({
      id: Number(k.id), ad: k.ad, miktar: Number(k.miktar), birim: k.birim,
      tenderId: k.ihale_kalem_id != null ? Number(k.ihale_kalem_id) : null,
    })),
  };
}

export async function getAllOrders(): Promise<ApiOrder[]> {
  const o = await db.execute('SELECT * FROM siparis_takip_siparisler ORDER BY etkinlik_ts');
  const k = await db.execute('SELECT * FROM siparis_takip_siparis_kalemleri ORDER BY id');
  const byOrder = new Map<number, any[]>();
  for (const row of k.rows as any[]) {
    const sid = Number(row.siparis_id);
    if (!byOrder.has(sid)) byOrder.set(sid, []);
    byOrder.get(sid)!.push(row);
  }
  return (o.rows as any[]).map((row) => serializeOrder(row, byOrder.get(Number(row.id)) || []));
}

export async function getOrderById(id: number): Promise<ApiOrder | null> {
  const o = await db.execute({ sql: 'SELECT * FROM siparis_takip_siparisler WHERE id = ?', args: [id] });
  const row: any = o.rows[0];
  if (!row) return null;
  const k = await db.execute({ sql: 'SELECT * FROM siparis_takip_siparis_kalemleri WHERE siparis_id = ? ORDER BY id', args: [id] });
  return serializeOrder(row, k.rows as any[]);
}

export async function getTender() {
  const r = await db.execute('SELECT * FROM siparis_takip_ihale_kalemleri ORDER BY id');
  return (r.rows as any[]).map((t) => ({
    id: Number(t.id), kalem: t.kalem, birim: t.birim, firma: t.firma,
    sozlesme: Number(t.sozlesme_miktari), kalan: Number(t.kalan_miktar),
  }));
}

export async function getNotifications() {
  const r = await db.execute('SELECT * FROM siparis_takip_bildirimler ORDER BY ts DESC LIMIT 40');
  return (r.rows as any[]).map((b) => ({
    id: Number(b.id), tip: b.tip, baslik: b.baslik, alt: b.alt || '',
    siparisId: b.siparis_id != null ? Number(b.siparis_id) : null, ts: Number(b.ts),
  }));
}

export async function pushBildirim(tip: string, baslik: string, alt: string, siparisId?: number | null, ts = Date.now()) {
  await db.execute({
    sql: 'INSERT INTO siparis_takip_bildirimler (tip, baslik, alt, siparis_id, ts) VALUES (?, ?, ?, ?, ?)',
    args: [tip, baslik, alt, siparisId ?? null, ts],
  });
}

async function nextKod(): Promise<string> {
  // En büyük SP-#### son ekini bul, +1. Boşsa 1050'den başla (prototip mantığı).
  const r = await db.execute(
    `SELECT MAX(CAST(substr(kod, 4) AS INTEGER)) AS m FROM siparis_takip_siparisler WHERE kod LIKE 'SP-%'`
  );
  const m = Number((r.rows[0] as any)?.m || 0);
  return 'SP-' + (m >= 1050 ? m + 1 : 1050);
}

async function ambarPersonel(): Promise<string> {
  const r = await db.execute("SELECT ad FROM siparis_takip_kullanicilar WHERE rol = 'ambar' ORDER BY id LIMIT 1");
  return (r.rows[0] as any)?.ad || 'Ambar Personeli';
}

export type CreateInput = {
  birim?: string;
  eventTs?: number;
  tedarik?: string; // kod
  note?: string;
  kalemler?: { ad?: string; miktar?: number | string; birim?: string; tenderId?: number | string | null }[];
};
export type CreateResult = { order: ApiOrder } | { error: string; status: number };

// İş kuralı 1-2: hazır olma = etkinlik − 1sa; ihale ise stok atomik düşülür, yetersizse 422.
export async function createOrder(input: CreateInput, user: SessionUser): Promise<CreateResult> {
  const birim = String(input.birim || '').trim();
  const eventTs = Number(input.eventTs);
  const tedarik = String(input.tedarik || '');
  const note = String(input.note || '').trim();

  if (!birim) return { error: 'Talep eden birim gerekli', status: 400 };
  if (!Number.isFinite(eventTs)) return { error: 'Geçerli bir etkinlik zamanı gerekli', status: 400 };
  if (tedarik !== TEDARIK_KOD.AMBAR && tedarik !== TEDARIK_KOD.IHALE)
    return { error: 'Geçersiz tedarik türü', status: 400 };

  const ihale = tedarik === TEDARIK_KOD.IHALE;

  // Kalemleri temizle/doğrula
  const raw = Array.isArray(input.kalemler) ? input.kalemler : [];
  const kalemler = raw
    .map((k) => ({
      ad: String(k.ad || '').trim(),
      miktar: Number(k.miktar),
      birim: String(k.birim || '').trim() || 'adet',
      tenderId: k.tenderId != null && k.tenderId !== '' ? Number(k.tenderId) : null,
    }))
    .filter((k) => (ihale ? k.tenderId != null : k.ad) && Number.isFinite(k.miktar) && k.miktar > 0);

  if (!kalemler.length) return { error: 'En az bir geçerli ürün kalemi gerekli', status: 400 };

  // İhale: stok yeterliliği (kalem başına toplam) — yetersizse 422
  const tender = await getTender();
  const tenderById = new Map(tender.map((t) => [t.id, t]));
  if (ihale) {
    const needed = new Map<number, number>();
    for (const k of kalemler) {
      if (k.tenderId == null || !tenderById.has(k.tenderId))
        return { error: 'Geçersiz ihale kalemi', status: 400 };
      needed.set(k.tenderId, (needed.get(k.tenderId) || 0) + k.miktar);
      // İhale kaleminin adı/birimi sözleşmeden alınır (tutarlılık)
      const ti = tenderById.get(k.tenderId)!;
      k.ad = ti.kalem;
      k.birim = ti.birim;
    }
    for (const [tid, miktar] of needed) {
      const ti = tenderById.get(tid)!;
      if (miktar > ti.kalan)
        return { error: `Kalan stok yetersiz: ${ti.kalem} (kalan ${ti.kalan} ${ti.birim}, istenen ${miktar})`, status: 422 };
    }
  }

  const atanan = ihale ? (tenderById.get(kalemler[0].tenderId!)?.firma || 'İhale Firması') : await ambarPersonel();
  const now = Date.now();
  const kod = await nextKod();

  // Sipariş kaydı
  const ins = await db.execute({
    sql: `INSERT INTO siparis_takip_siparisler
          (kod, talep_eden_birim, etkinlik_ts, hazir_olma_ts, tedarik_turu, durum, atanan, note, olusturan, olusturma_ts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [kod, birim, eventTs, eventTs - MS.sa, tedarik, DURUM.BEKLEMEDE, atanan, note, user.ad, now],
  });
  const sid = Number(ins.lastInsertRowid);

  // Kalemler + (ihale) stok düşümü TEK transaction (D1 batch atomik)
  try {
    const d1 = getDB();
    const stmts = kalemler.map((k) =>
      d1.prepare('INSERT INTO siparis_takip_siparis_kalemleri (siparis_id, ad, miktar, birim, ihale_kalem_id) VALUES (?, ?, ?, ?, ?)')
        .bind(sid, k.ad, k.miktar, k.birim, k.tenderId)
    );
    if (ihale) {
      const needed = new Map<number, number>();
      for (const k of kalemler) needed.set(k.tenderId!, (needed.get(k.tenderId!) || 0) + k.miktar);
      for (const [tid, miktar] of needed) {
        // Guard: yarış durumunda da negatife düşmesin
        stmts.push(
          d1.prepare('UPDATE siparis_takip_ihale_kalemleri SET kalan_miktar = kalan_miktar - ? WHERE id = ? AND kalan_miktar >= ?')
            .bind(miktar, tid, miktar)
        );
      }
    }
    await d1.batch(stmts);
  } catch (e: any) {
    // Atomik yazma başarısızsa sipariş başını geri al (orphan kalmasın)
    await db.execute({ sql: 'DELETE FROM siparis_takip_siparisler WHERE id = ?', args: [sid] });
    return { error: 'Sipariş kaydedilemedi: ' + (e?.message || 'bilinmeyen hata'), status: 500 };
  }

  await pushBildirim('yeni', `Yeni sipariş: ${kod}`, `${birim} · ${TEDARIK_ETIKET[tedarik]}`, sid, now);

  const order = await getOrderById(sid);
  return { order: order! };
}

export type DurumResult = { order: ApiOrder } | { error: string; status: number };

// İş kuralı 5: durum tek yönlü ilerler. Ambar yalnızca İç Üretim siparişlerini günceller.
export async function setOrderDurum(id: number, durumIn: string, user: SessionUser): Promise<DurumResult> {
  const durum = String(durumIn || '');
  if (!DURUM_SIRA.includes(durum as any)) return { error: 'Geçersiz durum', status: 400 };

  const r = await db.execute({ sql: 'SELECT * FROM siparis_takip_siparisler WHERE id = ?', args: [id] });
  const o: any = r.rows[0];
  if (!o) return { error: 'Sipariş bulunamadı', status: 404 };

  // Yetki: ambar sadece İç Üretim Ambarı siparişlerini ilerletebilir
  if (user.rol === 'ambar' && o.tedarik_turu !== TEDARIK_KOD.AMBAR)
    return { error: 'Bu sipariş ambar personeline atanmamış', status: 403 };

  const curIdx = DURUM_SIRA.indexOf(o.durum);
  const newIdx = DURUM_SIRA.indexOf(durum as any);
  if (newIdx < curIdx) return { error: 'Durum geriye alınamaz (tek yönlü akış)', status: 400 };

  // Hazır olunca alarm işaretini temizle (yeniden tetikleme önlemi)
  const clearAlarm = durum === DURUM.HAZIR ? 0 : Number(o.alarm_fired);
  await db.execute({
    sql: 'UPDATE siparis_takip_siparisler SET durum = ?, alarm_fired = ? WHERE id = ?',
    args: [durum, clearAlarm, id],
  });
  await pushBildirim('durum', `${o.kod} → ${durum}`, `${o.talep_eden_birim} · ${user.ad} güncelledi`, id);

  const order = await getOrderById(id);
  return { order: order! };
}
