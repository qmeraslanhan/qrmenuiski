import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { getSession } from '@/projects/siparis-takip/auth';

// GET /siparis-takip/api/auth/me → mevcut oturum kullanıcısı (sayfa açılışında restore)
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const u = await getSession(req);
  if (!u) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 });
  return NextResponse.json({ id: u.id, ad: u.ad, rol: u.rol, kullaniciAdi: u.kullaniciAdi, unvan: u.unvan, bas: u.bas, super: u.super });
}
