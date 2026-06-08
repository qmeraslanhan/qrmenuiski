// ─────────────────────────────────────────────────────────────────
// Randevu slot matematiği — salonun çalışma saatleri + slot adımı +
// mevcut (pending/approved) randevulardan uygun başlangıç saatlerini türetir.
// ─────────────────────────────────────────────────────────────────

export function toMin(t: string): number {
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export type Busy = { time: string; duration_min: number };

export type SlotOpts = {
  open: string;           // "09:00"
  close: string;          // "18:00"
  step: number;           // slot adımı (dk)
  serviceDuration: number;// seçilen hizmetin süresi (dk)
  busy: Busy[];           // [time, time+duration) aralıklarını işgal eden randevular
  nowMin?: number | null; // aynı gün ise: günün dakikası (geçmiş saatleri gizle), değilse null
};

// Uygun başlangıç saatleri listesi ("HH:MM").
export function availableSlots(opts: SlotOpts): string[] {
  const openM = toMin(opts.open);
  const closeM = toMin(opts.close);
  const step = Math.max(5, opts.step || 30);
  const dur = Math.max(5, opts.serviceDuration || 30);
  const busy = opts.busy.map(b => {
    const s = toMin(b.time);
    return { s, e: s + Math.max(5, b.duration_min || 30) };
  });

  const out: string[] = [];
  for (let s = openM; s + dur <= closeM; s += step) {
    if (opts.nowMin != null && s < opts.nowMin) continue; // geçmiş saat
    const e = s + dur;
    const overlaps = busy.some(b => s < b.e && e > b.s);
    if (!overlaps) out.push(toHHMM(s));
  }
  return out;
}

// Bir saatin (newStart, newDur) mevcut randevularla çakışıp çakışmadığı.
export function hasConflict(newTime: string, newDur: number, busy: Busy[]): boolean {
  const s = toMin(newTime);
  const e = s + Math.max(5, newDur || 30);
  return busy.some(b => {
    const bs = toMin(b.time);
    const be = bs + Math.max(5, b.duration_min || 30);
    return s < be && e > bs;
  });
}

// "YYYY-MM-DD" → JS getDay (0=Pazar..6=Cumartesi). UTC tabanlı (kararlı, TZ-bağımsız).
export function weekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

// Cloudflare Workers UTC çalışır; İstanbul = UTC+3 (sabit, DST yok).
export function istanbulNow(): { dateStr: string; minutes: number } {
  const ist = new Date(Date.now() + 3 * 3600 * 1000);
  return {
    dateStr: ist.toISOString().slice(0, 10),
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
  };
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Salon mola aralığını bir "busy" girişine çevirir (slot üretiminde dışlanır).
export function breakBusy(breakStart?: string | null, breakEnd?: string | null): Busy[] {
  if (!breakStart || !breakEnd) return [];
  const s = toMin(breakStart), e = toMin(breakEnd);
  if (!(e > s)) return [];
  return [{ time: breakStart, duration_min: e - s }];
}

// Kullanıcıya gösterilen kısa randevu kodu (RV-XXXXXX)
export function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'RV-' + s;
}
