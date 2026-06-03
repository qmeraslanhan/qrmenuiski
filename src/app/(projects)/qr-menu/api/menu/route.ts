import { NextResponse } from 'next/server';
import { db, ensureInit } from '@/lib/db';

export async function GET() {
  await ensureInit();
  const r = await db.execute(
    'SELECT id, name, slug, description, logo_url, theme_color FROM facilities ORDER BY name'
  );
  return NextResponse.json(r.rows);
}
