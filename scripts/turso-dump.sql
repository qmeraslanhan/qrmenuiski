-- Turso → D1 migration dump
-- Source: qr-menu.db
-- Generated: 2026-06-03T13:38:58.769Z
PRAGMA foreign_keys = OFF;

-- categories: 16 rows
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (1, 1, 'İçecekler', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (2, 1, 'Meşrubat Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (3, 1, 'Kahve Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (4, 1, 'Dondurma Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (5, 1, 'Yiyecekler', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (6, 1, 'Kahvaltı Menü 1', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (7, 1, 'Kahvaltı Menü 2', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (8, 2, 'Çay Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (9, 2, 'Meşrubat Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (10, 2, 'Yiyecek Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (11, 2, 'Kahvaltı Menü', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (12, 2, 'Kahve Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (13, 2, 'Dondurma Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (14, 3, 'Çay Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (15, 3, 'Meşrubat Grubu', 0);
INSERT INTO "categories" ("id", "facility_id", "name", "sort_order") VALUES (16, 3, 'Kahve Grubu', 0);

-- facilities: 3 rows
INSERT INTO "facilities" ("id", "name", "slug", "description", "logo_url", "theme_color", "created_at", "phone", "hours_text") VALUES (1, 'SU KAFE', 'su-kafe', 'Güzeltepe Mahallesi, Osmanpaşa Caddesi No:7 Eyüpsultan / İSTANBUL', NULL, '#0284c7', '2026-06-01 11:25:43', '0212 301 45 98', 'Hafta içi 08:00-16:00');
INSERT INTO "facilities" ("id", "name", "slug", "description", "logo_url", "theme_color", "created_at", "phone", "hours_text") VALUES (2, 'TERKOS KAFE', 'terkos-kafe', 'Terkos, 34277 Arnavutköy/İstanbul', NULL, '#059669', '2026-06-01 13:27:05', NULL, NULL);
INSERT INTO "facilities" ("id", "name", "slug", "description", "logo_url", "theme_color", "created_at", "phone", "hours_text") VALUES (3, 'KUZGUNCUK KÜLTÜR EVİ', 'kuzguncuk-kultur-evi', 'Kuzguncuk, İcadiye Cd. No:6, 34674 Üsküdar/İstanbul', NULL, '#e11d48', '2026-06-01 13:41:17', NULL, NULL);

-- login_attempts: empty

-- products: 111 rows
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (1, 1, 'SU', NULL, 6, NULL, 1, 0, '2026-06-01 12:35:52');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (2, 1, 'ÇAY KÜÇÜK', NULL, 6, NULL, 1, 0, '2026-06-01 12:36:05');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (3, 1, 'BİTKİ ÇAYI', NULL, 10, NULL, 1, 0, '2026-06-01 12:36:05');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (4, 1, 'ÇAY BÜYÜK', NULL, 12, NULL, 1, 0, '2026-06-01 12:36:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (5, 1, 'IHLAMUR (FRENCH PRESS)', NULL, 18, NULL, 1, 0, '2026-06-01 12:36:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (6, 2, 'SADE SODA', NULL, 10, NULL, 1, 0, '2026-06-01 12:36:40');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (7, 2, 'MEYVE SUYU', NULL, 15, NULL, 1, 0, '2026-06-01 12:36:40');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (8, 2, 'MEYVELİ SODA', NULL, 14, NULL, 1, 0, '2026-06-01 12:36:40');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (9, 2, 'COLA', NULL, 33, NULL, 1, 0, '2026-06-01 12:36:40');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (10, 2, 'GAZOZ', NULL, 25, NULL, 1, 0, '2026-06-01 12:36:40');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (11, 2, 'SADE SÜT', NULL, 16, NULL, 1, 0, '2026-06-01 12:36:41');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (12, 2, 'SADE SÜT LAKTOZSUZ', NULL, 25, NULL, 1, 0, '2026-06-01 12:36:41');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (13, 3, 'ESPRESSO', NULL, 25, NULL, 1, 0, '2026-06-01 12:37:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (14, 3, 'VANİL YALI LATTE', NULL, 75, NULL, 1, 0, '2026-06-01 12:37:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (15, 3, 'LATTE', NULL, 55, NULL, 1, 0, '2026-06-01 12:37:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (16, 3, 'KARAMEL LATTE', NULL, 85, NULL, 1, 0, '2026-06-01 12:37:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (17, 3, 'CAPPUCCİNO', NULL, 45, NULL, 1, 0, '2026-06-01 12:37:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (18, 3, 'MOCHA', NULL, 55, NULL, 1, 0, '2026-06-01 12:37:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (19, 3, 'WHITE CHOCOLATE MOCHA', NULL, 55, NULL, 1, 0, '2026-06-01 12:37:07');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (20, 3, 'AMERİCANO', NULL, 35, NULL, 1, 0, '2026-06-01 12:37:07');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (21, 3, 'CHAİ TEA LATTE', NULL, 60, NULL, 1, 0, '2026-06-01 12:37:18');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (22, 3, 'FİLTRE KAHVE', NULL, 35, NULL, 1, 0, '2026-06-01 12:37:18');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (23, 3, 'SICAK ÇİKOLATA', NULL, 45, NULL, 1, 0, '2026-06-01 12:37:18');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (24, 3, 'SÜTLÜ FİLTRE KAHVE', NULL, 50, NULL, 1, 0, '2026-06-01 12:37:18');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (25, 3, 'NESCAFE CLASSIC', NULL, 18, NULL, 1, 0, '2026-06-01 12:37:18');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (26, 3, 'NESCAFE GOLD', NULL, 18, NULL, 1, 0, '2026-06-01 12:37:19');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (27, 3, 'TÜRK KAHVESİ', NULL, 15, NULL, 1, 0, '2026-06-01 12:37:19');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (30, 4, 'DONDURMA 500 ML SADE', NULL, 180, NULL, 1, 0, '2026-06-01 12:37:36');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (31, 4, 'DONDURMA 500 ML SADE KAKAO/MEYVELİ', NULL, 180, NULL, 1, 0, '2026-06-01 12:37:36');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (32, 4, 'DONDURMA 100 ML SADE', NULL, 45, NULL, 1, 0, '2026-06-01 12:37:53');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (33, 4, 'DONDURMA 100 ML KAKAO/MEYVELİ', NULL, 45, NULL, 1, 0, '2026-06-01 12:37:53');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (34, 5, 'DEREOTLU POĞAÇA', NULL, 18, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (35, 5, 'GÜL BÖREĞİ', NULL, 35, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (36, 5, 'SİMİT', NULL, 18, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (37, 5, 'ÇORBA', NULL, 50, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (38, 5, 'SÜTLAÇ', NULL, 55, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (39, 5, 'TATLI ÇEŞİTLERİ', NULL, 80, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (40, 5, 'MAGNOLİA', NULL, 71, NULL, 1, 0, '2026-06-01 12:38:23');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (41, 5, 'MAGNOLİA (KAVANOZ)', NULL, 80, NULL, 1, 0, '2026-06-01 12:38:24');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (42, 5, 'HAYRABOLU TATLI SADE', NULL, 40, NULL, 1, 0, '2026-06-01 12:38:34');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (43, 5, 'HAYRABOLU TATLI KAYMAKLI', NULL, 50, NULL, 1, 0, '2026-06-01 12:38:34');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (44, 5, 'KURU PASTA 175GR', NULL, 55, NULL, 1, 0, '2026-06-01 12:38:34');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (45, 5, 'KURU PASTA 250GR', NULL, 75, NULL, 1, 0, '2026-06-01 12:38:34');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (46, 5, 'KURU PASTA 500GR', NULL, 150, NULL, 1, 0, '2026-06-01 12:38:34');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (47, 5, 'KURU PASTA 1000GR', NULL, 300, NULL, 1, 0, '2026-06-01 12:38:35');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (48, 6, 'Kahvaltı Menü 1', 'Dil Peyniri, Örgü Peyniri, Beyaz Peynir, Siyah Zeytin, T.Kaşar Peyniri, Salatalık, Çay (2 Adet), Ekmek (2 Adet), Yumurta', 165, NULL, 1, 0, '2026-06-01 12:39:08');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (49, 7, 'Kahvaltı Menü 2', 'Dil Peyniri, Örgü Peyniri, Beyaz Peynir, Siyah Zeytin, T.Kaşar Peyniri, Domates / Salatalık, Bal, Kaymak, Çay (2 Adet), Ekmek (2 Adet), Yumurta', 180, NULL, 1, 0, '2026-06-01 12:40:07');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (50, 8, 'SU', NULL, 10, NULL, 1, 0, '2026-06-01 13:32:59');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (51, 8, 'ÇAY KÜÇÜK', NULL, 10, NULL, 1, 0, '2026-06-01 13:33:22');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (52, 8, 'ÇAY BÜYÜK', NULL, 20, NULL, 1, 0, '2026-06-01 13:33:24');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (53, 8, 'TÜRK KAHVESİ', NULL, 30, NULL, 1, 0, '2026-06-01 13:33:26');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (54, 8, 'BİTKİ ÇAYI', NULL, 20, NULL, 1, 0, '2026-06-01 13:33:28');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (55, 8, 'IHLAMUR (FRENCH PRESS)', NULL, 30, NULL, 1, 0, '2026-06-01 13:33:30');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (56, 9, 'SADE SODA 200 CC', NULL, 18, NULL, 1, 0, '2026-06-01 13:33:59');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (57, 9, 'MEYVELİ SODA 200 CC', NULL, 23, NULL, 1, 0, '2026-06-01 13:34:00');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (58, 9, 'MEYVE SUYU', NULL, 23, NULL, 1, 0, '2026-06-01 13:34:02');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (59, 9, 'COCA COLA 200ML SPRİTE, FANTA 200 ML', NULL, 55, NULL, 1, 0, '2026-06-01 13:34:05');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (60, 9, 'ÇAMLICA SADE - PORTAKALLI', NULL, 42.5, NULL, 1, 0, '2026-06-01 13:34:07');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (61, 9, 'AYRAN 200ML', NULL, 23, NULL, 1, 0, '2026-06-01 13:34:09');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (62, 12, 'ESPRESSO', NULL, 42, NULL, 1, 0, '2026-06-01 13:34:42');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (63, 12, 'LATTE', NULL, 92, NULL, 1, 0, '2026-06-01 13:34:44');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (64, 12, 'CAPPUCCİNO', NULL, 77, NULL, 1, 0, '2026-06-01 13:34:46');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (65, 12, 'AMERİCANO', NULL, 61.5, NULL, 1, 0, '2026-06-01 13:34:49');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (66, 12, 'FİLTRE KAHVE', NULL, 61.5, NULL, 1, 0, '2026-06-01 13:34:51');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (67, 12, 'SÜTLÜ FİLTRE KAHVE', NULL, 85, NULL, 1, 0, '2026-06-01 13:34:53');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (68, 12, 'NESCAFE CLASSİC', NULL, 32, NULL, 1, 0, '2026-06-01 13:35:11');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (69, 12, 'NESCAFE GOLD', NULL, 32, NULL, 1, 0, '2026-06-01 13:35:13');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (70, 12, 'ICE AMERİCANO', NULL, 61.5, NULL, 1, 0, '2026-06-01 13:35:15');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (71, 12, 'ICE FİLTRE KAHVE', NULL, 61.5, NULL, 1, 0, '2026-06-01 13:35:17');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (72, 12, 'ICE FİLTRE KAHVE SÜTLÜ', NULL, 85, NULL, 1, 0, '2026-06-01 13:35:19');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (73, 12, 'ICE LATTE', NULL, 90, NULL, 1, 0, '2026-06-01 13:35:22');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (74, 10, 'DEREOTLU POĞAÇA', NULL, 30, NULL, 1, 0, '2026-06-01 13:36:02');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (75, 10, 'GÜL BÖREĞİ', NULL, 60, NULL, 1, 0, '2026-06-01 13:36:03');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (76, 10, 'KALEM BÖREĞİ', NULL, 70, NULL, 1, 0, '2026-06-01 13:36:06');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (77, 10, 'SUCUKLU-KAŞARLI TOST', NULL, 140, NULL, 1, 0, '2026-06-01 13:36:08');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (78, 10, 'SUCUKLU TOST', NULL, 120, NULL, 1, 0, '2026-06-01 13:36:10');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (79, 10, 'KAŞARLI TOST', NULL, 85, NULL, 1, 0, '2026-06-01 13:36:12');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (80, 10, 'PATATES TAVA', NULL, 95, NULL, 1, 0, '2026-06-01 13:36:15');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (81, 10, 'HAMBURGER', NULL, 310, NULL, 1, 0, '2026-06-01 13:36:17');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (82, 10, 'BURGER SUCUK', NULL, 400, NULL, 1, 0, '2026-06-01 13:36:40');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (83, 10, 'IZGARA KÖFTE', NULL, 310, NULL, 1, 0, '2026-06-01 13:36:42');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (84, 10, 'GÜVEÇTE SUCUK', NULL, 250, NULL, 1, 0, '2026-06-01 13:36:44');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (85, 10, 'MENEMEN', NULL, 175, NULL, 1, 0, '2026-06-01 13:36:46');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (86, 10, 'PUDİNG', NULL, 124, NULL, 1, 0, '2026-06-01 13:36:48');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (87, 10, 'SÜTLAÇ', NULL, 95, NULL, 1, 0, '2026-06-01 13:36:51');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (88, 10, 'HAYRABOLU SADE', NULL, 70, NULL, 1, 0, '2026-06-01 13:36:53');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (89, 10, 'HAYRABOLU KAYMAKLI', NULL, 80, NULL, 1, 0, '2026-06-01 13:36:55');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (90, 10, 'TATLI TUZLU KURUPASTA KG', NULL, 510, NULL, 1, 0, '2026-06-01 13:36:57');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (91, 13, 'DONDURMA 100 ML SADE', NULL, 77, NULL, 1, 0, '2026-06-01 13:37:27');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (92, 13, 'DONDURMA 100 ML KAKAO/MEYVELİ', NULL, 77, NULL, 1, 0, '2026-06-01 13:37:29');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (93, 13, 'DONDURMA 500 ML SADE', NULL, 310, NULL, 1, 0, '2026-06-01 13:37:31');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (94, 13, 'DONDURMA 500 ML SADE KAKAO/MEYVELİ', NULL, 310, NULL, 1, 0, '2026-06-01 13:37:34');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (95, 11, 'SERPME KAHVALTI', 'Dil peyniri, örgü peyniri, beyaz peynir, siyah zeytin, kaşar peyniri, sigara böreği, domates/salatalık, bal, kaymak, reçel, çay (3 adet büyük), ekmek (2 adet), yumurta', 300, NULL, 1, 0, '2026-06-01 13:37:56');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (96, 14, 'SU KÜÇÜK', NULL, 10, NULL, 1, 0, '2026-06-01 13:43:52');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (97, 14, 'ÇAY KÜÇÜK', NULL, 10, NULL, 1, 0, '2026-06-01 13:43:54');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (98, 14, 'ÇAY BÜYÜK', NULL, 20, NULL, 1, 0, '2026-06-01 13:43:57');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (99, 14, 'TÜRK KAHVESİ', NULL, 30, NULL, 1, 0, '2026-06-01 13:43:59');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (100, 14, 'BİTKİ ÇAYI', NULL, 20, NULL, 1, 0, '2026-06-01 13:44:01');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (101, 15, 'SADE SODA', NULL, 18, NULL, 1, 0, '2026-06-01 13:44:20');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (102, 15, 'MEYVELİ SODA', NULL, 23, NULL, 1, 0, '2026-06-01 13:44:22');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (103, 15, 'MEYVE SUYU', NULL, 23, NULL, 1, 0, '2026-06-01 13:44:24');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (104, 15, 'COLA', NULL, 55, NULL, 1, 0, '2026-06-01 13:44:27');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (105, 15, 'PORTAKALLI GAZOZ', NULL, 42.5, NULL, 1, 0, '2026-06-01 13:44:29');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (106, 16, 'ESPRESSO', NULL, 42, NULL, 1, 0, '2026-06-01 13:44:58');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (107, 16, 'LATTE', NULL, 92, NULL, 1, 0, '2026-06-01 13:45:00');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (108, 16, 'CAPPUCCİNO', NULL, 77, NULL, 1, 0, '2026-06-01 13:45:02');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (109, 16, 'AMERİCANO', NULL, 61.5, NULL, 1, 0, '2026-06-01 13:45:04');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (110, 16, 'FİLTRE KAHVE', NULL, 61.5, NULL, 1, 0, '2026-06-01 13:45:07');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (111, 16, 'SÜTLÜ FİLTRE KAHVE', NULL, 85, NULL, 1, 0, '2026-06-01 13:45:09');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (112, 16, 'NESCAFE CLASSİC', NULL, 32, NULL, 1, 0, '2026-06-01 13:45:11');
INSERT INTO "products" ("id", "category_id", "name", "description", "price", "image_url", "is_active", "sort_order", "created_at") VALUES (113, 16, 'NESCAFE GOLD', NULL, 32, NULL, 1, 0, '2026-06-01 13:45:13');

-- session_facilities: 1 rows
INSERT INTO "session_facilities" ("token", "facility_id") VALUES ('5de78ef0e98118c4cc6e1f371993a544ec5a066fc796e48846c5457166818fe2', 1);

-- sessions: 5 rows
INSERT INTO "sessions" ("token", "role", "user_id", "username", "created_at", "expires_at") VALUES ('3bafd1a9e8040f946b58036e455fef4cb700aa25676d2579cb654826f8c3c69f', 'admin', NULL, NULL, '2026-06-01 15:12:18', NULL);
INSERT INTO "sessions" ("token", "role", "user_id", "username", "created_at", "expires_at") VALUES ('1dd93cb230276167ad39d87b6817b40d0ad42cd176b25b22aa56c0f2becf45e1', 'admin', NULL, NULL, '2026-06-01 20:19:31', '2026-06-08T20:19:31.164Z');
INSERT INTO "sessions" ("token", "role", "user_id", "username", "created_at", "expires_at") VALUES ('2b2c28d7c069c7819e4833831df061f542062bb1e5aecafbe60d2c7b46815cf2', 'admin', NULL, NULL, '2026-06-03 05:44:20', '2026-06-10T05:44:20.040Z');
INSERT INTO "sessions" ("token", "role", "user_id", "username", "created_at", "expires_at") VALUES ('e0f8c9b2dc0e9458f0753c2138ef57d3b50c81ba44d723e45391de4058eb08bb', 'admin', NULL, NULL, '2026-06-03 06:49:20', '2026-06-10T06:49:20.014Z');
INSERT INTO "sessions" ("token", "role", "user_id", "username", "created_at", "expires_at") VALUES ('5de78ef0e98118c4cc6e1f371993a544ec5a066fc796e48846c5457166818fe2', 'user', 1, 'sukafe', '2026-06-03 09:22:37', '2026-06-10T09:22:37.014Z');

-- user_facilities: 1 rows
INSERT INTO "user_facilities" ("user_id", "facility_id") VALUES (1, 1);

-- users: 1 rows
INSERT INTO "users" ("id", "username", "password", "created_at") VALUES (1, 'sukafe', '$2b$10$wtJb9Vk6mKe22.jdMnfaxucltLU9CMAPfzlm4aVvwzgOgLIjea0/K', '2026-06-01 15:47:46');
