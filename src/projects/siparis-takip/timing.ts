// ─────────────────────────────────────────────────────────────────
// Zamanlama & durum hesapları.
// 2026-06-10 kural değişikliği: sipariş saati BİREBİR esastır — 1 saat erken
// alma YOK. Sayaç teslim (etkinlik) saatine sayar; ALARM son 1 saatte çalar.
// Frontend (app.html) aynı mantığın bir kopyasını client'ta çalıştırır.
// ─────────────────────────────────────────────────────────────────
import { TAMAMLANMIS } from './db-schema';

export const MS = { dk: 60 * 1000, sa: 60 * 60 * 1000, gun: 24 * 60 * 60 * 1000 };

export type TimingInput = { etkinlik_ts: number; durum: string };

export type Timing = {
  ready: number;       // geriye uyum: artık = etkinlik (teslim) saati
  msToReady: number;   // geriye uyum: artık = msToEvent
  msToEvent: number;
  tamam: boolean;
  alarm: boolean;
  level: 'yesil' | 'sari' | 'kirmizi' | 'tamam';
};

// Renk seviyesi + alarm:
//  - Tamamlanmış (Hazır/Yola Çıktı/Teslim) → 'tamam'
//  - Kırmızı: teslime ≤ 1 saat veya geçmiş
//  - Sarı:   teslime ≤ 3 saat
//  - Yeşil:  üstü
//  ALARM: teslime 1 saat kala hâlâ "Hazır" değilse.
export function orderTiming(o: TimingInput, now: number): Timing {
  const msToEvent = o.etkinlik_ts - now;
  const tamam = TAMAMLANMIS.includes(o.durum as any);
  const alarm = !tamam && now >= o.etkinlik_ts - 1 * MS.sa;

  let level: Timing['level'];
  if (tamam) level = 'tamam';
  else if (msToEvent <= 1 * MS.sa) level = 'kirmizi';
  else if (msToEvent <= 3 * MS.sa) level = 'sari';
  else level = 'yesil';

  return { ready: o.etkinlik_ts, msToReady: msToEvent, msToEvent, tamam, alarm, level };
}

// İstanbul saatiyle HH:MM (sunucu UTC çalışır → tz sabitlenir)
const _trTime = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
export function fmtTime(ts: number): string {
  return _trTime.format(new Date(ts));
}
