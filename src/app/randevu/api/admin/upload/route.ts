import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth';
import { uploadImage } from '@/lib/r2';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];

// Admin görsel yükleme → R2 (randevu/ klasörü), public CDN URL döner.
export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const auth = await getAuth(req);
  if (!auth) return unauthorized();
  if (!isAdmin(auth)) return forbidden();

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'multipart/form-data bekleniyor' }, { status: 400 });
  }

  const fd = await req.formData();
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Dosya 5 MB sınırını aşıyor' }, { status: 400 });
  }
  if (file.type && !OK_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Yalnızca görsel dosyaları yüklenebilir' }, { status: 400 });
  }

  try {
    const buf = await file.arrayBuffer();
    const url = await uploadImage(buf, file.name || 'salon.jpg', 'randevu');
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: 'Yükleme başarısız: ' + (e?.message || 'bilinmeyen hata') }, { status: 500 });
  }
}
