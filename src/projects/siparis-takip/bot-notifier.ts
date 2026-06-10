// ─────────────────────────────────────────────────────────────────
// Bot Bildirici — dış mesajlaşma (Telegram) tek izole nokta.
// Kanal: Telegram Bot API (Cloudflare Workers'tan HTTP ile çalışır; grup+kişi).
//   - Bot token: TELEGRAM_BOT_TOKEN (Cloudflare secret — hassas).
//   - Hedef chat/grup id: panelden ayarlanır (settings: telegram_chat_id).
// WhatsApp ileride eklenecekse de tek değişecek yer burasıdır.
// Hata fırlatmaz (sipariş/alarm akışını bölmesin).
// ─────────────────────────────────────────────────────────────────
import { fmtTime } from './timing';
import { getSetting } from './settings';

function esc(s: any): string {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

// Telegram'a mesaj gönder (yapılandırılmamışsa sessizce atlar).
export async function sendTelegram(text: string): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = (await getSetting('telegram_chat_id', '')) || process.env.TELEGRAM_CHAT_ID || '';
  const enabled = (await getSetting('telegram_enabled', '1')) !== '0';
  if (!token || !chatId || !enabled) {
    console.log('[BOT] Telegram atlandı (token/chat/enabled eksik). Mesaj:\n' + text);
    return { ok: false, skipped: true };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!r.ok) console.log('[BOT] Telegram yanıt:', r.status);
    return { ok: r.ok };
  } catch (e: any) {
    console.log('[BOT] Telegram hata:', e?.message);
    return { ok: false };
  }
}

// ── Alarm (kritik gecikme) ──
export type BotOrder = { kod: string; birim: string; etkinlik_ts: number };
export function botMessage(order: BotOrder): string {
  return `🔴 <b>KRİTİK</b>: ${esc(order.kod)} — ${esc(order.birim)}\nHazır olma vaktine 1 saatten az kaldı, sipariş hâlâ "Hazır" değil.\nEtkinlik: ${fmtTime(order.etkinlik_ts)}`;
}
export async function botNotifier(order: BotOrder): Promise<void> {
  await sendTelegram(botMessage(order));
}
// Not: ihale siparişi Telegram bildirimi 2026-06-10'da kaldırıldı (yerine Sipariş Mektubu).
