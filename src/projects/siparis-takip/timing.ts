// ─────────────────────────────────────────────────────────────────
// Zamanlama & durum hesapları — tasarım prototipindeki data.jsx ile BİREBİR.
// Hem cron alarm taraması hem (gerekirse) sunucu doğrulaması bunu kullanır.
// Frontend (app.html) aynı mantığın bir kopyasını client'ta çalıştırır.
// ─────────────────────────────────────────────────────────────────
import { TAMAMLANMIS } from './db-schema';

export const MS = { dk: 60 * 1000, sa: 60 * 60 * 1000 };

export type TimingInput = { etkinlik_ts: number; durum: string };

export type Timing = {
  ready: number;
  msToReady: number;
  msToEvent: number;
  tamam: boolean;
  alarm: boolean;
  level: 'yesil' | 'sari' | 'kirmizi' | 'tamam';
};

// hazır olma vakti = etkinlik − 1 saat
export function computeReady(etkinlikTs: number): number {
  return etkinlikTs - 1 * MS.sa;
}

// Renk seviyesi + alarm (data.jsx → orderTiming birebir):
//  - Tamamlanmış (Hazır/Yola Çıktı/Teslim) → 'tamam'
//  - Kırmızı: hazır olmaya ≤ 1 saat veya geçmiş
//  - Sarı:   hazır olmaya ≤ 3 saat
//  - Yeşil:  üstü
//  ALARM: etkinliğe 2 saat kala (teslimata 1 saat) hâlâ "Hazır" değilse.
export function orderTiming(o: TimingInput, now: number): Timing {
  const ready = computeReady(o.etkinlik_ts);
  const msToReady = ready - now;
  const msToEvent = o.etkinlik_ts - now;
  const tamam = TAMAMLANMIS.includes(o.durum as any);
  const alarm = !tamam && now >= o.etkinlik_ts - 2 * MS.sa;

  let level: Timing['level'];
  if (tamam) level = 'tamam';
  else if (msToReady <= 1 * MS.sa) level = 'kirmizi';
  else if (msToReady <= 3 * MS.sa) level = 'sari';
  else level = 'yesil';

  return { ready, msToReady, msToEvent, tamam, alarm, level };
}

// İstanbul saatiyle HH:MM (sunucu UTC çalışır → tz sabitlenir)
const _trTime = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
export function fmtTime(ts: number): string {
  return _trTime.format(new Date(ts));
}
