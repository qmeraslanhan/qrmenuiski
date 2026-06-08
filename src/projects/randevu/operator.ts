// ─────────────────────────────────────────────────────────────────
// Salon operatörleri — admin bir üyeyi salona atar; o üye (member token
// ile) o salonun günlük randevularını görüp yönetebilir. Yetki kontrolü
// daima randevu_salon_operators üzerinden yapılır (kendi salonuyla sınırlı).
// ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/d1';

// Üyenin atandığı salonlar (id + ad + slug). Hiç atama yoksa boş dizi.
export async function operatorSalons(memberId: number): Promise<{ id: number; name: string; slug: string }[]> {
  const r = await db.execute({
    sql: `SELECT s.id, s.name, s.slug
            FROM randevu_salon_operators o
            JOIN randevu_salons s ON s.id = o.salon_id
           WHERE o.member_id = ?
           ORDER BY s.sort_order, s.name`,
    args: [memberId],
  });
  return (r.rows as any[]).map((x) => ({ id: Number(x.id), name: String(x.name), slug: String(x.slug) }));
}

// Üye bu salonun operatörü mü?
export async function isOperatorOf(memberId: number, salonId: number | string): Promise<boolean> {
  const r = await db.execute({
    sql: 'SELECT 1 FROM randevu_salon_operators WHERE member_id = ? AND salon_id = ? LIMIT 1',
    args: [memberId, salonId],
  });
  return !!r.rows[0];
}
