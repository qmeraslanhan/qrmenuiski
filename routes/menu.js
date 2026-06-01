const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { db } = require('../database/db');

// Tüm tesisleri public olarak listele (müşteri tesis seçimi için)
router.get('/', async (req, res, next) => {
  try {
    const r = await db.execute(
      'SELECT id, name, slug, description, logo_url, theme_color FROM facilities ORDER BY name'
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const facilityResult = await db.execute({
      sql: 'SELECT * FROM facilities WHERE slug = ?',
      args: [req.params.slug],
    });
    const facility = facilityResult.rows[0];
    if (!facility) return res.status(404).json({ error: 'Tesis bulunamadı' });

    const categoriesResult = await db.execute({
      sql: 'SELECT * FROM categories WHERE facility_id = ? ORDER BY sort_order, id',
      args: [facility.id],
    });

    const categoriesWithProducts = [];
    for (const cat of categoriesResult.rows) {
      const productsResult = await db.execute({
        sql: 'SELECT id, name, description, price, image_url FROM products WHERE category_id = ? AND is_active = 1 ORDER BY sort_order, id',
        args: [cat.id],
      });
      if (productsResult.rows.length > 0) {
        categoriesWithProducts.push({ ...cat, products: productsResult.rows });
      }
    }

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
        phone: facility.phone,
        hours_text: facility.hours_text,
      },
      categories: categoriesWithProducts,
      qrCode,
      menuUrl,
    });
  } catch (e) { next(e); }
});

module.exports = router;
