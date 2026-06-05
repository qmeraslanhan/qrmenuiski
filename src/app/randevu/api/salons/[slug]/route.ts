import { NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';

// Public: salon detayı + aktif hizmetler + aktif ustalar
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureRandevuInit();
  const { slug } = await params;

  const sr = await db.execute({
    sql: 'SELECT * FROM randevu_salons WHERE slug = ? AND is_active = 1',
    args: [slug],
  });
  const salon: any = sr.rows[0];
  if (!salon) return NextResponse.json({ error: 'Salon bulunamadı' }, { status: 404 });

  const services = await db.execute({
    sql: `SELECT id, name, duration_min, price FROM randevu_services
           WHERE salon_id = ? AND is_active = 1 ORDER BY sort_order, id`,
    args: [salon.id],
  });
  const staff = await db.execute({
    sql: `SELECT id, name FROM randevu_staff
           WHERE salon_id = ? AND is_active = 1 ORDER BY sort_order, id`,
    args: [salon.id],
  });

  return NextResponse.json({
    salon: {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      type: salon.type,
      description: salon.description,
      address: salon.address,
      phone: salon.phone,
      image_url: salon.image_url,
      open_time: salon.open_time,
      close_time: salon.close_time,
      slot_minutes: salon.slot_minutes,
      work_days: salon.work_days,
    },
    services: services.rows,
    staff: staff.rows,
  });
}
