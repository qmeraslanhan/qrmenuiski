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

// Panelin okuyacağı bildirim ayarları (token ASLA dönmez — yalnız "tanımlı mı").
export async function getNotifySettings() {
  return {
    telegramChatId: await getSetting('telegram_chat_id', ''),
    telegramEnabled: (await getSetting('telegram_enabled', '1')) !== '0',
    telegramTokenVar: !!process.env.TELEGRAM_BOT_TOKEN,
  };
}
