import { NextRequest, NextResponse } from 'next/server';
import { ensureRandevuInit } from '@/projects/randevu/db-schema';
import { getMember } from '@/projects/randevu/member-auth';
import { operatorSalons } from '@/projects/randevu/operator';

// Üyenin operatör olduğu salonlar (panel görünürlüğü için)
export async function GET(req: NextRequest) {
  await ensureRandevuInit();
  const member = await getMember(req);
  if (!member) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });

  const salons = await operatorSalons(member.id);
  return NextResponse.json({ salons });
}
