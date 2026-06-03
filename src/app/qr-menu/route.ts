import { NextResponse } from 'next/server';

export function GET() {
  return new NextResponse('hello qr-menu', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
