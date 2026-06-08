import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getMember, changeMemberPassword } from '@/projects/randevu/member-auth';
import { logActivity } from '@/projects/randevu/activity';

// Üye kendi şifresini değiştirir (oturum + mevcut şifre doğrulaması).
export async function POST(req: NextRequest) {
  await ensureRandevuInit();
  const member = await getMember(req);
  if (!member) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const current = String(b.current || b.current_password || '');
  const next = String(b.password || b.new_password || '');

  const res = await changeMemberPassword(member.id, current, next);
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 });
  await logActivity(
    { type: 'member', id: member.id, name: member.name },
    'member.password', 'member', member.id, `${member.name} şifresini değiştirdi`
  );
  return NextResponse.json({ success: true });
}
