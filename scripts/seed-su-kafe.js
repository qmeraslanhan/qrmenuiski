// Su Kafe — PDF'den çıkarılan kategori/ürün listesini Turso'ya yazar.
// Çalıştırma (PowerShell):
//   $env:TURSO_DATABASE_URL = "libsql://..."
//   $env:TURSO_AUTH_TOKEN  = "..."
//   npm run seed:sukafe
//
// Idempotent: tekrar çalıştırılırsa duplicate üretmez (var olanları atlar).

const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Bu script direkt INSERT yapıyor — şema halihazırda mevcut varsayılıyor.
// Eğer ilk kez çalıştırılıyorsa önce `npm run dev` veya bir API çağrısı yap (ensureInit migrate eder).
async function ensureInit() { /* no-op: şema canlı uygulamadan migrate edildi */ }

const FACILITY = {
  slug: 'su-kafe',
  name: 'Su Kafe',
  description: 'Kafe ve restoran',
};

const CATEGORY_IMAGES = {
  'Sıcak İçecekler':       'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&q=80',
  'Meşrubat':              'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&q=80',
  'Kahve':                 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80',
  'Dondurma':              'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&q=80',
  'Yiyecekler & Tatlılar': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
  'Kahvaltı Menüleri':     'https://images.unsplash.com/photo-1533089860892-a7c6f10a081a?w=600&q=80',
};

const SEED = [
  { category: 'Sıcak İçecekler', products: [
    { name: 'Su', price: 6 },
    { name: 'Çay (Küçük)', price: 6 },
    { name: 'Çay (Büyük)', price: 12 },
    { name: 'Bitki Çayı', price: 10 },
    { name: 'Ihlamur (French Press)', price: 18 },
  ]},
  { category: 'Meşrubat', products: [
    { name: 'Sade Soda', price: 10 },
    { name: 'Meyveli Soda', price: 14 },
    { name: 'Meyve Suyu', price: 15 },
    { name: 'Cola', price: 33 },
    { name: 'Gazoz', price: 25 },
    { name: 'Sade Süt', price: 16 },
    { name: 'Sade Süt (Laktozsuz)', price: 25 },
  ]},
  { category: 'Kahve', products: [
    { name: 'Espresso', price: 25 },
    { name: 'Latte', price: 55 },
    { name: 'Vanilyalı Latte', price: 75 },
    { name: 'Karamel Latte', price: 85 },
    { name: 'Cappuccino', price: 45 },
    { name: 'Mocha', price: 55 },
    { name: 'White Chocolate Mocha', price: 55 },
    { name: 'Americano', price: 35 },
    { name: 'Chai Tea Latte', price: 60 },
    { name: 'Sıcak Çikolata', price: 45 },
    { name: 'Filtre Kahve', price: 35 },
    { name: 'Sütlü Filtre Kahve', price: 50 },
    { name: 'Nescafe Classic', price: 18 },
    { name: 'Nescafe Gold', price: 18 },
    { name: 'Türk Kahvesi', price: 15 },
  ]},
  { category: 'Dondurma', products: [
    { name: 'Dondurma 100 ml (Sade)', price: 45 },
    { name: 'Dondurma 100 ml (Kakao/Meyveli)', price: 45 },
    { name: 'Dondurma 500 ml (Sade)', price: 180 },
    { name: 'Dondurma 500 ml (Kakao/Meyveli)', price: 180 },
  ]},
  { category: 'Yiyecekler & Tatlılar', products: [
    { name: 'Dereotlu Poğaça', price: 18 },
    { name: 'Gül Böreği', price: 35 },
    { name: 'Simit', price: 18 },
    { name: 'Çorba', price: 50 },
    { name: 'Sütlaç', price: 55 },
    { name: 'Tatlı Çeşitleri', price: 80 },
    { name: 'Magnolia', price: 71 },
    { name: 'Magnolia (Kavanoz)', price: 80 },
    { name: 'Hayrabolu Tatlı (Sade)', price: 40 },
    { name: 'Hayrabolu Tatlı (Kaymaklı)', price: 50 },
    { name: 'Kuru Pasta 175gr', price: 55 },
    { name: 'Kuru Pasta 250gr', price: 75 },
    { name: 'Kuru Pasta 500gr', price: 150 },
    { name: 'Kuru Pasta 1000gr', price: 300 },
  ]},
  { category: 'Kahvaltı Menüleri', products: [
    { name: 'Kahvaltı Menü 1', price: 165,
      description: 'Dil peyniri, örgü peyniri, beyaz peynir, siyah zeytin, taze kaşar peyniri, salatalık, çay (2 adet), ekmek (2 adet), yumurta' },
    { name: 'Kahvaltı Menü 2', price: 180,
      description: 'Dil peyniri, örgü peyniri, beyaz peynir, siyah zeytin, taze kaşar peyniri, domates/salatalık, bal, kaymak, çay (2 adet), ekmek (2 adet), yumurta' },
  ]},
];

async function getOrCreateFacility() {
  const r = await db.execute({
    sql: 'SELECT id, name FROM facilities WHERE slug = ?',
    args: [FACILITY.slug],
  });
  if (r.rows[0]) return { id: r.rows[0].id, created: false };

  const ins = await db.execute({
    sql: 'INSERT INTO facilities (name, slug, description) VALUES (?, ?, ?)',
    args: [FACILITY.name, FACILITY.slug, FACILITY.description],
  });
  return { id: Number(ins.lastInsertRowid), created: true };
}

async function getOrCreateCategory(facilityId, name, sortOrder) {
  const r = await db.execute({
    sql: 'SELECT id FROM categories WHERE facility_id = ? AND name = ?',
    args: [facilityId, name],
  });
  if (r.rows[0]) return { id: r.rows[0].id, created: false };

  const ins = await db.execute({
    sql: 'INSERT INTO categories (facility_id, name, sort_order) VALUES (?, ?, ?)',
    args: [facilityId, name, sortOrder],
  });
  return { id: Number(ins.lastInsertRowid), created: true };
}

async function getOrCreateProduct(categoryId, p, imageUrl, sortOrder) {
  const r = await db.execute({
    sql: 'SELECT id FROM products WHERE category_id = ? AND name = ?',
    args: [categoryId, p.name],
  });
  if (r.rows[0]) return { created: false };

  await db.execute({
    sql: 'INSERT INTO products (category_id, name, description, price, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    args: [categoryId, p.name, p.description || null, p.price, imageUrl, sortOrder],
  });
  return { created: true };
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('HATA: TURSO_DATABASE_URL ve TURSO_AUTH_TOKEN env vars set edilmemiş.');
    console.error('PowerShell:');
    console.error('  $env:TURSO_DATABASE_URL = "libsql://..."');
    console.error('  $env:TURSO_AUTH_TOKEN  = "..."');
    process.exit(1);
  }

  await ensureInit();

  const fac = await getOrCreateFacility();
  console.log(`${fac.created ? '+ Tesis oluşturuldu' : '✓ Tesis bulundu'}: ${FACILITY.name} (id=${fac.id})`);

  let catCount = 0, prodCount = 0, catSkip = 0, prodSkip = 0;

  for (let ci = 0; ci < SEED.length; ci++) {
    const block = SEED[ci];
    const cat = await getOrCreateCategory(fac.id, block.category, ci + 1);
    if (cat.created) { catCount++; console.log(`  + ${block.category} (id=${cat.id})`); }
    else { catSkip++; console.log(`  · ${block.category} (mevcut, id=${cat.id})`); }

    const imageUrl = CATEGORY_IMAGES[block.category] || null;
    for (let pi = 0; pi < block.products.length; pi++) {
      const p = block.products[pi];
      const res = await getOrCreateProduct(cat.id, p, imageUrl, pi + 1);
      if (res.created) { prodCount++; console.log(`      + ${p.name} — ${p.price} TL`); }
      else { prodSkip++; }
    }
  }

  console.log(`\n✓ Toplam: ${catCount} kategori eklendi (${catSkip} mevcut), ${prodCount} ürün eklendi (${prodSkip} mevcut).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('HATA:', e); process.exit(1); });
