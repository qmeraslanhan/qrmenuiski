import { NextResponse } from 'next/server';
import { db } from '@/lib/d1';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';

// Public: aktif salon listesi
export async function GET() {
  await ensureRandevuInit();
  const r = await db.execute(
    `SELECT id, name, slug, type, description, address, phone, image_url,
            open_time, close_time, work_days
       FROM randevu_salons
      WHERE is_active = 1
      ORDER BY sort_order, name`
  );
  return NextResponse.json(r.rows);
}
