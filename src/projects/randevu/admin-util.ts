// ─────────────────────────────────────────────────────────────────
// Admin tarafı giriş parse/normalize yardımcıları (salon alanları).
// POST (create): existing = {} → varsayılanlar uygulanır.
// PATCH (update): existing = mevcut satır → sadece gönderilen alanlar değişir.
// ─────────────────────────────────────────────────────────────────

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

function str(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function normTime(v: any, fallback: string): string {
  if (v === undefined || v === null || v === '') return fallback;
  const m = TIME_RE.exec(String(v).trim());
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Mola gibi opsiyonel saatler: boş/geçersiz → null
function normTimeOrNull(v: any, existing: string | null): string | null {
  if (v === undefined) return existing ?? null;
  if (v === null || String(v).trim() === '') return null;
  const m = TIME_RE.exec(String(v).trim());
  if (!m) return existing ?? null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function normWorkDays(v: any, fallback: string): string {
  if (v === undefined || v === null || v === '') return fallback;
  const arr = Array.isArray(v) ? v : String(v).split(',');
  const days = [...new Set(
    arr.map((d: any) => Number(String(d).trim()))
       .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
  )].sort((a, b) => a - b);
  return days.length ? days.join(',') : fallback;
}

function clampInt(v: any, min: number, max: number, fallback: number): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const VALID_TYPES = ['berber', 'kuafor', 'both', 'diger'];

export type SalonFields = {
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  image_url: string | null;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  slot_minutes: number;
  work_days: string;
  is_active: number;
  sort_order: number;
};

export function parseSalonInput(b: any, existing: any): SalonFields {
  const e = existing || {};
  const name = b.name !== undefined ? String(b.name).trim() : (e.name || '');
  const type = b.type !== undefined && VALID_TYPES.includes(String(b.type))
    ? String(b.type) : (e.type || 'berber');

  return {
    name,
    type,
    description: b.description !== undefined ? str(b.description) : (e.description ?? null),
    address: b.address !== undefined ? str(b.address) : (e.address ?? null),
    phone: b.phone !== undefined ? str(b.phone) : (e.phone ?? null),
    image_url: b.image_url !== undefined ? str(b.image_url) : (e.image_url ?? null),
    open_time: b.open_time !== undefined ? normTime(b.open_time, e.open_time || '09:00') : (e.open_time || '09:00'),
    close_time: b.close_time !== undefined ? normTime(b.close_time, e.close_time || '18:00') : (e.close_time || '18:00'),
    break_start: normTimeOrNull(b.break_start, e.break_start ?? null),
    break_end: normTimeOrNull(b.break_end, e.break_end ?? null),
    slot_minutes: b.slot_minutes !== undefined ? clampInt(b.slot_minutes, 5, 240, e.slot_minutes || 30) : (e.slot_minutes || 30),
    work_days: b.work_days !== undefined ? normWorkDays(b.work_days, e.work_days || '1,2,3,4,5,6') : (e.work_days || '1,2,3,4,5,6'),
    is_active: b.is_active !== undefined ? (b.is_active ? 1 : 0) : (e.is_active ?? 1),
    sort_order: b.sort_order !== undefined ? clampInt(b.sort_order, 0, 9999, e.sort_order || 0) : (e.sort_order ?? 0),
  };
}
