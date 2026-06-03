import { NextResponse } from 'next/server';
export function GET() {
  return new NextResponse('test ok', { headers: { 'Content-Type': 'text/plain' } });
}
