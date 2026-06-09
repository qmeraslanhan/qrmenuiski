// ─────────────────────────────────────────────────────────────────
// Bot Bildirici — ALARM'da dış mesajlaşma kanalını tetikleyen TEK izole nokta.
//
// Şimdilik yalnızca console.log yapar (DB log'u çağıran cron tarafında yazılır).
// İLERİDE: aşağıdaki TODO'da Telegram Bot API veya WhatsApp Cloud API'ye bağlanır.
// Tüm dış-servis bağımlılığı burada kalsın ki API/cron kodu sabit kalsın.
// ─────────────────────────────────────────────────────────────────
import { fmtTime } from './timing';

export type BotOrder = { kod: string; birim: string; etkinlik_ts: number };

// Kritik gecikme mesajı (Telegram/WhatsApp'a gidecek metin önizlemesi).
export function botMessage(order: BotOrder): string {
  return `🔴 KRİTİK: ${order.kod} — ${order.birim}\nHazır olma vaktine 1 saatten az kaldı, sipariş hâlâ "Hazır" değil.\nEtkinlik: ${fmtTime(order.etkinlik_ts)}`;
}

// Alarm tetiklendiğinde çağrılır. Hata fırlatmaz (cron taramasını bölmesin).
export async function botNotifier(order: BotOrder): Promise<void> {
  const msg = botMessage(order);
  console.log('[BOT] Alarm tetiklendi:\n' + msg);

  // ── TODO: Gerçek bot entegrasyonu ──────────────────────────────
  // Telegram örneği (secret'lar wrangler secret put ile):
  //   const token = process.env.TELEGRAM_BOT_TOKEN;
  //   const chatId = process.env.TELEGRAM_CHAT_ID;
  //   if (token && chatId) {
  //     await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ chat_id: chatId, text: msg }),
  //     });
  //   }
  // WhatsApp Cloud API örneği:
  //   await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, { ... });
  // ───────────────────────────────────────────────────────────────
}
