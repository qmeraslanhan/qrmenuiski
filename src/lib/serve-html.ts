import { NextResponse } from 'next/server';

// Webpack `asset/source` ile HTML'leri bundle'a embed eder (Vercel cold-start için).
import adminHtml from '@/html/admin.html';
import loginHtml from '@/html/login.html';
import menuHtml from '@/html/menu.html';
import printMenuHtml from '@/html/print-menu.html';
import tesislerHtml from '@/html/tesisler.html';

const HTML: Record<string, string> = {
  'admin.html': adminHtml,
  'login.html': loginHtml,
  'menu.html': menuHtml,
  'print-menu.html': printMenuHtml,
  'tesisler.html': tesislerHtml,
};

export function serveHtml(filename: string): NextResponse {
  const html = HTML[filename];
  if (!html) {
    return new NextResponse(`HTML not found: ${filename}`, { status: 500 });
  }
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
