import { AwsClient } from 'aws4fetch';

let _client: AwsClient | null = null;

function getClient(): AwsClient {
  if (_client) return _client;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID veya R2_SECRET_ACCESS_KEY env vars eksik');
  }
  _client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  return _client;
}

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (!accountId || !bucket || !publicBase) {
    throw new Error('R2_ACCOUNT_ID / R2_BUCKET / R2_PUBLIC_BASE_URL env vars eksik');
  }
  return { accountId, bucket, publicBase: publicBase.replace(/\/+$/, '') };
}

// Güvenlik: SVG kasıtlı olarak YOK (içine JS gömülüp CDN'den XSS çalıştırılabilir).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const OK_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
};

function extToContentType(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  return OK_EXT[ext] || 'application/octet-stream';
}

export async function uploadImage(
  data: ArrayBuffer | Uint8Array,
  filename: string,
  folder = 'qr-menu'
): Promise<string> {
  const { accountId, bucket, publicBase } = getConfig();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-');

  // Merkezi doğrulama — tüm çağıranlar (qr-menu + randevu) için geçerli.
  const ext = safe.toLowerCase().split('.').pop() || '';
  if (!(ext in OK_EXT)) {
    throw new Error('İzin verilmeyen dosya türü (yalnızca jpg, png, webp, gif, avif)');
  }
  const byteLength = data instanceof Uint8Array ? data.byteLength : (data as ArrayBuffer).byteLength;
  if (byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Dosya 5 MB sınırını aşıyor');
  }

  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

  const contentType = extToContentType(safe);
  const body = new Blob([data as ArrayBuffer], { type: contentType });

  const r = await getClient().fetch(url, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': contentType },
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`R2 upload failed (${r.status}): ${txt.slice(0, 200)}`);
  }
  return `${publicBase}/${key}`;
}
