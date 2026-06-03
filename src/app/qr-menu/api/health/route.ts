import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';

export async function GET() {
  try {
    await ensureInit();
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: e.message }, { status: 500 });
  }
}
