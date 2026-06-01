const express = require('express');
const path = require('path');
const { ensureInit } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB schema'sını ilk istekte hazırla (Vercel cold start için)
app.use(async (req, res, next) => {
  try {
    await ensureInit();
    next();
  } catch (e) {
    console.error('DB init hatası:', e);
    res.status(500).json({ error: 'Veritabanı başlatılamadı' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/admin', require('./routes/admin'));
app.use('/api/menu', require('./routes/menu'));

// /menu/:slug isteği → menu.html sayfasını sun (JS slug'ı URL'den okur)
app.get('/menu/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

app.get('/', (req, res) => res.redirect('/login.html'));

// 404 — API istekleri için JSON döndür
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Endpoint bulunamadı: ${req.method} ${req.path}` });
  }
  next();
});

// Global hata handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Dosya boyutu 5MB\'ı aşamaz' });
  }
  console.error(err);
  res.status(400).json({ error: err.message || 'Sunucu hatası' });
});

// Local geliştirmede dinle; Vercel'de app handler olarak export edilir
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n QR Menü Sistemi → http://localhost:${PORT}`);
    console.log(` Admin Paneli   → http://localhost:${PORT}/login.html`);
    console.log(` Admin Şifresi  → ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
  });
}

module.exports = app;
