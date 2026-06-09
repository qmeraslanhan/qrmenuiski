import { serveHtml } from '@/lib/serve-html';

// /siparis-takip → tek sayfa SPA (rol seçimi, panel, yeni sipariş, detay,
// ambar görevleri, ihale havuzu, bildirimler). Tüm veri /siparis-takip/api/*
// uçlarından çekilir.
export const GET = () => serveHtml('siparis-takip/app.html');
