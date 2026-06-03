import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const cache = new Map<string, string>();

export async function serveHtml(filename: string): Promise<NextResponse> {
  let html = cache.get(filename);
  if (!html) {
    const filePath = path.join(process.cwd(), 'src', 'html', filename);
    html = await fs.readFile(filePath, 'utf-8');
    cache.set(filename, html);
  }
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
