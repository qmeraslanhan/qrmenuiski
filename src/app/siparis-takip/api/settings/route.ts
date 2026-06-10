import { NextRequest, NextResponse } from 'next/server';
import { ensureSiparisInit } from '@/projects/siparis-takip/db-schema';
import { guard } from '@/projects/siparis-takip/auth';
import { getNotifySettings, setSetting } from '@/projects/siparis-takip/settings';
import { logActivity } from '@/projects/siparis-takip/activity';

// GET → bildirim ayarları (token ASLA dönmez, yalnız tanımlı mı) — yalnız yönetici
export async function GET(req: NextRequest) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  return NextResponse.json(await getNotifySettings());
}

// PATCH → telegram_chat_id + telegram_enabled güncelle — yalnız yönetici
export async function PATCH(req: NextRequest) {
  await ensureSiparisInit();
  const g = await guard(req, 'yonetici');
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => ({} as any));
  if (b.telegramChatId !== undefined) await setSetting('telegram_chat_id', String(b.telegramChatId).trim());
  if (b.telegramEnabled !== undefined) await setSetting('telegram_enabled', b.telegramEnabled ? '1' : '0');
  const m = b.mektup || {};
  if (m.teslimYeri !== undefined) await setSetting('mektup_teslim_yeri', String(m.teslimYeri));
  if (m.teslimSekli !== undefined) await setSetting('mektup_teslim_sekli', String(m.teslimSekli));
  if (m.telFaks !== undefined) await setSetting('mektup_tel_faks', String(m.telFaks));
  if (m.maddeler !== undefined) await setSetting('mektup_maddeler', String(m.maddeler));
  await logActivity(g.ctx, 'ayar.guncelle', 'ayar', null, 'Bildirim / mektup ayarları güncellendi');
  return NextResponse.json(await getNotifySettings());
}
