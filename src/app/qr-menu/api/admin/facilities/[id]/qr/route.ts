import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db, ensureInit } from '@/lib/db';
import { getAuth, canAccessFacility, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!canAccessFacility(auth, id)) return forbidden('Bu tesise erişim yetkiniz yok');

  const fr = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [id] });
  const f: any = fr.rows[0];
  if (!f) return NextResponse.json({ error: 'Tesis bulunamadı' }, { status: 404 });

  const host = req.headers.get('host') || 'iskisosyaltesisler.com';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const menuUrl = `${proto}://${host}/qr-menu/menu/${f.slug}`;
  const qrCode = await QRCode.toDataURL(menuUrl, { width: 300, margin: 2 });
  return NextResponse.json({ qrCode, menuUrl });
}
