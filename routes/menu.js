const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../database/db');

router.get('/:slug', async (req, res) => {
  const facility = db.prepare('SELECT * FROM facilities WHERE slug = ?').get(req.params.slug);
  if (!facility) return res.status(404).json({ error: 'Tesis bulunamadı' });

  const categories = db.prepare(
    'SELECT * FROM categories WHERE facility_id = ? ORDER BY sort_order, id'
  ).all(facility.id);

  const categoriesWithProducts = categories
    .map(cat => ({
      ...cat,
      products: db.prepare(
        'SELECT id, name, description, price, image_url FROM products WHERE category_id = ? AND is_active = 1 ORDER BY sort_order, id'
      ).all(cat.id),
    }))
    .filter(cat => cat.products.length > 0);

  const menuUrl = `${req.protocol}://${req.get('host')}/menu/${facility.slug}`;
  const qrCode = await QRCode.toDataURL(menuUrl, { width: 200, margin: 1 });

  res.json({
    facility: {
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
      description: facility.description,
      logo_url: facility.logo_url,
      theme_color: facility.theme_color,
    },
    categories: categoriesWithProducts,
    qrCode,
    menuUrl,
  });
});

module.exports = router;
