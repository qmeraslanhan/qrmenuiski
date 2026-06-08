// ─────────────────────────────────────────────────────────────────
// E-posta gönderimi — Resend API (https://resend.com).
// Secret: RESEND_API_KEY (wrangler secret put RESEND_API_KEY).
// Opsiyonel: RESEND_FROM (varsayılan: noreply@omeraslanhan.com).
// Key yoksa sessizce atlanır — randevu akışı bozulmaz.
// ─────────────────────────────────────────────────────────────────

const DEFAULT_FROM = 'İSKİ Randevu <noreply@omeraslanhan.com>';

export async function sendEmail(opts: { to: string; subject: string; html: string }):
  Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[randevu] RESEND_API_KEY tanımlı değil — e-posta atlandı:', opts.to);
    return { ok: false, skipped: true };
  }
  const from = process.env.RESEND_FROM || DEFAULT_FROM;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('[randevu] Resend hata', res.status, t);
      return { ok: false, error: `http ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[randevu] Resend exception', e?.message);
    return { ok: false, error: e?.message };
  }
}

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

// "YYYY-MM-DD" + "HH:MM" (İstanbul) → Google Takvim "Takvime Ekle" URL'i (UTC)
export function googleCalUrl(title: string, date: string, time: string, durationMin: number, details: string, location: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const startUtc = new Date(Date.UTC(y, (mo || 1) - 1, d || 1, (hh || 0) - 3, mm || 0)); // İstanbul = UTC+3
  const endUtc = new Date(startUtc.getTime() + Math.max(5, durationMin) * 60_000);
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startUtc)}/${fmt(endUtc)}`,
    details,
    location,
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

// Randevu alındığında gönderilen "talebiniz alındı" maili
export function bookingEmailHtml(d: {
  name: string; salon: string; service: string; staff?: string | null; date: string; time: string;
  durationMin?: number; code?: string;
}): string {
  const rows: [string, string][] = [
    ...(d.code ? [['Randevu Kodu', d.code] as [string, string]] : []),
    ['Salon', d.salon],
    ['Hizmet', d.service],
    ...(d.staff ? [['Usta', d.staff] as [string, string]] : []),
    ['Tarih', d.date],
    ['Saat', d.time],
  ];
  const gcal = googleCalUrl(`${d.salon} — ${d.service}`, d.date, d.time, d.durationMin || 30,
    `Randevu${d.code ? ' (' + d.code + ')' : ''}: ${d.service}`, d.salon);
  const rowsHtml = rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 0;color:#6B6358;font-size:14px;">${esc(k)}</td>
      <td style="padding:8px 0;color:#2B2926;font-size:14px;font-weight:600;text-align:right;">${esc(v)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#0B1E3F;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FBFAF6;border-radius:16px;overflow:hidden;border:1px solid #C9A961;">
      <div style="background:#0B1E3F;padding:28px 24px;text-align:center;">
        <div style="color:#C9A961;font-size:13px;letter-spacing:3px;text-transform:uppercase;">İSKİ Kültür ve Sosyal İşler</div>
        <div style="color:#F5E6CC;font-size:24px;font-weight:700;margin-top:8px;">Randevunuz Onaylandı</div>
      </div>
      <div style="padding:26px 28px;">
        <p style="color:#2B2926;font-size:15px;margin:0 0 6px;">Merhaba ${esc(d.name)},</p>
        <p style="color:#6B6358;font-size:14px;line-height:1.6;margin:0 0 18px;">
          Randevunuz başarıyla oluşturuldu ve <b style="color:#0F7B4F;">onaylandı</b>.
          Aşağıdaki bilgilerle sizi bekliyoruz.
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #E7DEC9;border-bottom:1px solid #E7DEC9;">
          ${rowsHtml}
        </table>
        <div style="text-align:center;margin:18px 0 0;">
          <a href="${esc(gcal)}" style="display:inline-block;background:#0F4C81;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:10px;">📅 Takvime Ekle</a>
        </div>
        <p style="color:#8A8275;font-size:12px;line-height:1.6;margin:18px 0 0;">
          Bu e-posta randevu sisteminden otomatik gönderilmiştir.
        </p>
      </div>
      <div style="background:#EFE9DC;padding:14px;text-align:center;color:#8A8275;font-size:12px;">
        © İSKİ Kültür ve Sosyal İşler Şube Müdürlüğü
      </div>
    </div>
  </body></html>`;
}

// Şifre sıfırlama bağlantısı maili
export function resetEmailHtml(d: { name: string; url: string }): string {
  return `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#0B1E3F;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FBFAF6;border-radius:16px;overflow:hidden;border:1px solid #C9A961;">
      <div style="background:#0B1E3F;padding:28px 24px;text-align:center;">
        <div style="color:#C9A961;font-size:13px;letter-spacing:3px;text-transform:uppercase;">İSKİ Randevu Sistemi</div>
        <div style="color:#F5E6CC;font-size:24px;font-weight:700;margin-top:8px;">Şifre Sıfırlama</div>
      </div>
      <div style="padding:26px 28px;">
        <p style="color:#2B2926;font-size:15px;margin:0 0 6px;">Merhaba ${esc(d.name)},</p>
        <p style="color:#6B6358;font-size:14px;line-height:1.6;margin:0 0 20px;">
          Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı <b>1 saat</b> geçerlidir.
          Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.
        </p>
        <div style="text-align:center;margin:0 0 20px;">
          <a href="${esc(d.url)}" style="display:inline-block;background:#C9A961;color:#0B1E3F;font-weight:700;font-size:15px;text-decoration:none;padding:13px 28px;border-radius:12px;">Şifremi Sıfırla</a>
        </div>
        <p style="color:#8A8275;font-size:12px;line-height:1.6;margin:0;word-break:break-all;">
          Buton çalışmazsa bu adresi tarayıcınıza yapıştırın:<br>${esc(d.url)}
        </p>
      </div>
      <div style="background:#EFE9DC;padding:14px;text-align:center;color:#8A8275;font-size:12px;">
        © İSKİ Kültür ve Sosyal İşler Şube Müdürlüğü
      </div>
    </div>
  </body></html>`;
}

// Randevu öncesi hatırlatma maili
export function reminderEmailHtml(d: {
  name: string; salon: string; service: string; staff?: string | null; date: string; time: string;
  durationMin?: number; code?: string;
}): string {
  const rows: [string, string][] = [
    ...(d.code ? [['Randevu Kodu', d.code] as [string, string]] : []),
    ['Salon', d.salon],
    ['Hizmet', d.service],
    ...(d.staff ? [['Usta', d.staff] as [string, string]] : []),
    ['Tarih', d.date],
    ['Saat', d.time],
  ];
  const rowsHtml = rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 0;color:#6B6358;font-size:14px;">${esc(k)}</td>
      <td style="padding:8px 0;color:#2B2926;font-size:14px;font-weight:600;text-align:right;">${esc(v)}</td>
    </tr>`).join('');
  const gcal = googleCalUrl(`${d.salon} — ${d.service}`, d.date, d.time, d.durationMin || 30,
    `Randevu${d.code ? ' (' + d.code + ')' : ''}: ${d.service}`, d.salon);

  return `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#0B1E3F;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FBFAF6;border-radius:16px;overflow:hidden;border:1px solid #C9A961;">
      <div style="background:#0B1E3F;padding:28px 24px;text-align:center;">
        <div style="color:#C9A961;font-size:13px;letter-spacing:3px;text-transform:uppercase;">İSKİ Randevu Sistemi</div>
        <div style="color:#F5E6CC;font-size:24px;font-weight:700;margin-top:8px;">Randevu Hatırlatması</div>
      </div>
      <div style="padding:26px 28px;">
        <p style="color:#2B2926;font-size:15px;margin:0 0 6px;">Merhaba ${esc(d.name)},</p>
        <p style="color:#6B6358;font-size:14px;line-height:1.6;margin:0 0 18px;">
          Yaklaşan randevunuzu hatırlatmak isteriz. Aşağıdaki bilgilerle sizi bekliyoruz.
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #E7DEC9;border-bottom:1px solid #E7DEC9;">
          ${rowsHtml}
        </table>
        <div style="text-align:center;margin:18px 0 0;">
          <a href="${esc(gcal)}" style="display:inline-block;background:#0F4C81;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:10px;">📅 Takvime Ekle</a>
        </div>
        <p style="color:#8A8275;font-size:12px;line-height:1.6;margin:18px 0 0;">
          Gelemeyecekseniz lütfen "Hesabım" sayfasından randevunuzu iptal edin.
        </p>
      </div>
      <div style="background:#EFE9DC;padding:14px;text-align:center;color:#8A8275;font-size:12px;">
        © İSKİ Kültür ve Sosyal İşler Şube Müdürlüğü
      </div>
    </div>
  </body></html>`;
}
