const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

require('./database/db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Global hata handler (multer hataları dahil)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Dosya boyutu 5MB\'ı aşamaz' });
  }
  res.status(400).json({ error: err.message || 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`\n QR Menü Sistemi → http://localhost:${PORT}`);
  console.log(` Admin Paneli   → http://localhost:${PORT}/login.html`);
  console.log(` Admin Şifresi  → ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
});
