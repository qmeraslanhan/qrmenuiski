import { serveHtml } from '@/lib/serve-html';
// Booking sayfası — slug'ı client JS, path'ten okur (/randevu/salon/<slug>)
export const GET = () => serveHtml('randevu/randevu.html');
