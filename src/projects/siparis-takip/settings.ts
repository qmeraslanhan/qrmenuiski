// ─────────────────────────────────────────────────────────────────
// Basit anahtar/değer ayar deposu (panelden düzenlenebilen ayarlar).
// Telegram chat id, bildirim açık/kapalı gibi hassas-olmayan ayarlar burada.
// HASSAS sırlar (bot token, ADMIN_PASSWORD) burada DEĞİL — Cloudflare secret.
// ─────────────────────────────────────────────────────────────────
import { db } from '@/lib/d1';

export async function getSetting(key: string, def = ''): Promise<string> {
  try {
    const r = await db.execute({ sql: 'SELECT value FROM siparis_takip_settings WHERE key = ?', args: [key] });
    const v = (r.rows[0] as any)?.value;
    return v == null ? def : String(v);
  } catch { return def; }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.execute({
    sql: `INSERT INTO siparis_takip_settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [key, String(value ?? '')],
  });
}

// Sipariş Mektubu şablonu — örnek resimdeki resmî metinler varsayılan.
// Panelden düzenlenebilir; kuruma göre değiştirilebilir.
export const MEKTUP_DEFAULT = {
  teslimYeri: 'Firmanız kuryesi tarafından İSKİ Genel Müdürlüğü A Blok Oda 101 bırakılmalıdır.',
  teslimSekli: 'Firmanız kuryesi tarafından teslim edilmelidir.',
  telFaks: '0212 411 1300',
  maddeler: [
    'Malzemelerin nakliyesi, indirilmesi, varsa montaj ve işçilik ile ilgili tüm giderler yüklenici firmaya aittir.',
    'İş /Malın teslim yerine; Fatura, İrsaliye ve Ticaret İşleri Dairesince Onaylı Sipariş Mektubumuz ile birlikte teslim edilecektir.',
    'Mal/Malzemenin teslim edildiği günün tarihi itibariyle taşınır kayıt kontrol yetkilisince taşınır geçici alındısı ve/veya taşınır işlem fişi tanzim edilecek ve bu tarih, malzemenin teslim edildiği tarih olarak geçerlilik kazanacaktır.',
    'Yüklenici fatura adres bilgilerini; İSKİ GENEL MÜDÜRLÜĞÜ Güzeltepe Mah. Alibey Cad. No: 7 34060 Eyüp/ İSTANBUL – Vergi Dairesi olarak da Gaziosmanpaşa Vd. 4810039491 olarak yazacaktır.',
    'Sipariş mektubunun alındığı tarafınızca teyit edilerek, oaslanhan@iski.gov.tr maile gönderilmesi zorunludur.',
    'Sipariş konusu iş, ilgili Mal / Hizmet Alım Sözleşmesi ve eklerine uygun ifa edilecektir.',
    'Siparişin teslim edileceği adreste kimsenin olmaması halinde 0535 642 50 62 numarası ile iletişime geçebilirsiniz.',
  ].join('\n'),
};

// Panelin okuyacağı ayarlar (Telegram kaldırıldı — yalnız mektup şablonu).
export async function getNotifySettings() {
  return {
    mektup: {
      teslimYeri: await getSetting('mektup_teslim_yeri', MEKTUP_DEFAULT.teslimYeri),
      teslimSekli: await getSetting('mektup_teslim_sekli', MEKTUP_DEFAULT.teslimSekli),
      telFaks: await getSetting('mektup_tel_faks', MEKTUP_DEFAULT.telFaks),
      maddeler: await getSetting('mektup_maddeler', MEKTUP_DEFAULT.maddeler),
    },
  };
}
