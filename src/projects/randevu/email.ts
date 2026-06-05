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

// Randevu alındığında gönderilen "talebiniz alındı" maili
export function bookingEmailHtml(d: {
  name: string; salon: string; service: string; staff?: string | null; date: string; time: string;
}): string {
  const rows: [string, string][] = [
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

  return `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#0B1E3F;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FBFAF6;border-radius:16px;overflow:hidden;border:1px solid #C9A961;">
      <div style="background:#0B1E3F;padding:28px 24px;text-align:center;">
        <div style="color:#C9A961;font-size:13px;letter-spacing:3px;text-transform:uppercase;">İSKİ Kültür ve Sosyal İşler</div>
        <div style="color:#F5E6CC;font-size:24px;font-weight:700;margin-top:8px;">Randevu Talebiniz Alındı</div>
      </div>
      <div style="padding:26px 28px;">
        <p style="color:#2B2926;font-size:15px;margin:0 0 6px;">Merhaba ${esc(d.name)},</p>
        <p style="color:#6B6358;font-size:14px;line-height:1.6;margin:0 0 18px;">
          Randevu talebiniz başarıyla oluşturuldu ve <b style="color:#9A6B00;">onay bekliyor</b>.
          Talebiniz onaylandığında sizinle iletişime geçilecektir.
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #E7DEC9;border-bottom:1px solid #E7DEC9;">
          ${rowsHtml}
        </table>
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
