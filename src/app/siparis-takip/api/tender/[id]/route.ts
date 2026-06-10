import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { guard } from '@/projects/siparis-takip/auth';
import { updateTenderItem, deleteTenderItem } from '@/projects/siparis-takip/data';

// PATCH → ihale kalemi güncelle (kalem, firma, birim, sozlesme, kalan) — yalnız yönetici
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const r = await updateTenderItem(Number(id), b, g.ctx);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}

// DELETE → ihale kalemi sil (bağlı sipariş yoksa) — yalnız yönetici
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const { id } = await params;
  const r = await deleteTenderItem(Number(id), g.ctx);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
