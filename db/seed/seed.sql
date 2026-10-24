-- =====================================================================
-- SEED: dữ liệu mẫu cửa hàng trang sức
--  * 7 danh mục, ~40 sản phẩm thật (viết tay, JSONB đầy đủ)
--  * + 3.000 sản phẩm sinh tự động để benchmark index
--  * 500 khách hàng, ~30.000 đơn hàng rải từ 01/2026 -> 10/2026 (để thấy partition + BRIN)
-- Chạy: psql $DATABASE_URL -f db/seed/seed.sql   (hoặc npm run seed)
-- =====================================================================

BEGIN;

-- ---------------- Danh mục ----------------
INSERT INTO categories (slug, name) VALUES
  ('nhan',        'Nhẫn'),
  ('bong-tai',    'Bông tai'),
  ('day-chuyen',  'Dây chuyền'),
  ('lac-tay',     'Lắc tay'),
  ('mat-day',     'Mặt dây chuyền'),
  ('vong-tay',    'Vòng tay'),
  ('nhan-cuoi',   'Nhẫn cưới');
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug='nhan') WHERE slug = 'nhan-cuoi';

-- ---------------- Sản phẩm viết tay ----------------
-- image_url trỏ vào ảnh minh hoạ trong web/public/img (thay bằng ảnh thật khi deploy)
INSERT INTO products (sku, slug, name, category_id, price, stock, attributes, description, image_url) VALUES
-- Nhẫn kim cương
('NK-001','nhan-kim-cuong-vang-trang-18k-halo','Nhẫn kim cương vàng trắng 18K Halo',
  (SELECT id FROM categories WHERE slug='nhan'), 28500000, 2,
  '{"metal":"Vàng trắng 18K","weight_g":2.8,"ring_size":12,"stone":"Kim cương","carat":0.5,"color":"F","clarity":"VS1","cut":"Excellent","gender":"Nữ"}',
  'Nhẫn kim cương thiết kế Halo, viên chủ 5 ly nước F độ sạch VS1, viền tấm 32 viên tấm. Kèm giấy kiểm định GIA.', '/img/nhan.svg'),
('NK-002','nhan-kim-cuong-vang-18k-solitaire','Nhẫn kim cương vàng 18K Solitaire 6 chấu',
  (SELECT id FROM categories WHERE slug='nhan'), 42000000, 1,
  '{"metal":"Vàng 18K","weight_g":3.1,"ring_size":13,"stone":"Kim cương","carat":0.7,"color":"E","clarity":"VVS2","cut":"Excellent","gender":"Nữ"}',
  'Nhẫn kim cương Solitaire cổ điển 6 chấu, viên chủ 5.6 ly. Phù hợp làm nhẫn cầu hôn.', '/img/nhan.svg'),
('NK-003','nhan-nam-kim-cuong-vang-18k','Nhẫn nam kim cương vàng 18K mặt vuông',
  (SELECT id FROM categories WHERE slug='nhan'), 35800000, 3,
  '{"metal":"Vàng 18K","weight_g":6.5,"ring_size":18,"stone":"Kim cương","carat":0.3,"color":"G","clarity":"VS2","gender":"Nam"}',
  'Nhẫn nam bản to mặt vuông, viên chủ 4.5 ly, 2 hàng tấm hai bên. Mạnh mẽ, sang trọng.', '/img/nhan.svg'),
('NK-004','nhan-vang-trang-14k-da-cz','Nhẫn vàng trắng 14K đính đá CZ',
  (SELECT id FROM categories WHERE slug='nhan'), 3900000, 12,
  '{"metal":"Vàng trắng 14K","weight_g":1.9,"ring_size":11,"stone":"CZ","gender":"Nữ"}',
  'Nhẫn vàng trắng 14K đính đá CZ cao cấp, lấp lánh như kim cương, giá mềm.', '/img/nhan.svg'),
('NK-005','nhan-vang-24k-tron-1-chi','Nhẫn vàng 24K trơn 1 chỉ',
  (SELECT id FROM categories WHERE slug='nhan'), 12600000, 8,
  '{"metal":"Vàng 24K","weight_g":3.75,"ring_size":14,"style":"Trơn","gender":"Unisex"}',
  'Nhẫn vàng 9999 trơn 1 chỉ, tích trữ hoặc làm quà. Khắc tên miễn phí.', '/img/nhan.svg'),
('NK-006','nhan-bac-925-ngoc-trai','Nhẫn bạc 925 ngọc trai',
  (SELECT id FROM categories WHERE slug='nhan'), 890000, 25,
  '{"metal":"Bạc 925","weight_g":2.2,"ring_size":12,"stone":"Ngọc trai","pearl_mm":7,"gender":"Nữ"}',
  'Nhẫn bạc 925 xi bạch kim, ngọc trai nuôi 7mm. Nhẹ nhàng, nữ tính.', '/img/nhan.svg'),
('NK-007','nhan-vang-18k-da-ruby','Nhẫn vàng 18K đá Ruby',
  (SELECT id FROM categories WHERE slug='nhan'), 18900000, 2,
  '{"metal":"Vàng 18K","weight_g":3.4,"ring_size":12,"stone":"Ruby","carat":1.2,"origin":"Lục Yên","gender":"Nữ"}',
  'Nhẫn vàng 18K đá Ruby Lục Yên 1.2ct màu đỏ huyết bồ câu, viền tấm CZ.', '/img/nhan.svg'),
('NK-008','nhan-vang-18k-da-sapphire-xanh','Nhẫn vàng 18K đá Sapphire xanh',
  (SELECT id FROM categories WHERE slug='nhan'), 16500000, 2,
  '{"metal":"Vàng 18K","weight_g":3.2,"ring_size":11,"stone":"Sapphire","carat":1.0,"color":"Xanh dương","gender":"Nữ"}',
  'Nhẫn Sapphire xanh hoàng gia, kiểu dáng cổ điển, hợp mệnh Thuỷ - Mộc.', '/img/nhan.svg'),
-- Nhẫn cưới
('NC-001','cap-nhan-cuoi-vang-18k-tron','Cặp nhẫn cưới vàng 18K trơn',
  (SELECT id FROM categories WHERE slug='nhan-cuoi'), 14800000, 5,
  '{"metal":"Vàng 18K","weight_g":5.2,"pair":true,"style":"Trơn","engraving":true}',
  'Cặp nhẫn cưới vàng 18K trơn bo tròn, đeo êm tay, khắc tên và ngày cưới miễn phí.', '/img/nhan-cuoi.svg'),
('NC-002','cap-nhan-cuoi-vang-trang-kim-cuong','Cặp nhẫn cưới vàng trắng đính kim cương tấm',
  (SELECT id FROM categories WHERE slug='nhan-cuoi'), 26900000, 3,
  '{"metal":"Vàng trắng 18K","weight_g":5.8,"pair":true,"stone":"Kim cương","carat":0.15,"engraving":true}',
  'Cặp nhẫn cưới vàng trắng, nhẫn nữ đính 5 viên kim cương tấm, nhẫn nam 1 viên.', '/img/nhan-cuoi.svg'),
('NC-003','cap-nhan-cuoi-vang-hong-14k','Cặp nhẫn cưới vàng hồng 14K',
  (SELECT id FROM categories WHERE slug='nhan-cuoi'), 11900000, 6,
  '{"metal":"Vàng hồng 14K","weight_g":4.6,"pair":true,"stone":"CZ","engraving":true}',
  'Cặp nhẫn cưới vàng hồng trẻ trung, nhẫn nữ đính đá CZ.', '/img/nhan-cuoi.svg'),
-- Bông tai
('BT-001','bong-tai-kim-cuong-vang-trang-18k','Bông tai kim cương vàng trắng 18K',
  (SELECT id FROM categories WHERE slug='bong-tai'), 21500000, 2,
  '{"metal":"Vàng trắng 18K","weight_g":2.1,"stone":"Kim cương","carat":0.4,"style":"Nụ","clasp":"Chốt vặn"}',
  'Bông tai nụ kim cương, mỗi bên 1 viên 3.6 ly, chốt vặn an toàn.', '/img/bong-tai.svg'),
('BT-002','bong-tai-vang-18k-ngoc-trai','Bông tai vàng 18K ngọc trai Akoya',
  (SELECT id FROM categories WHERE slug='bong-tai'), 7900000, 4,
  '{"metal":"Vàng 18K","weight_g":1.8,"stone":"Ngọc trai","pearl_mm":8,"origin":"Akoya","style":"Nụ"}',
  'Bông tai ngọc trai Akoya 8mm ánh hồng, thanh lịch cho công sở.', '/img/bong-tai.svg'),
('BT-003','bong-tai-bac-925-khuyen-tron','Bông tai bạc 925 khuyên tròn',
  (SELECT id FROM categories WHERE slug='bong-tai'), 450000, 40,
  '{"metal":"Bạc 925","weight_g":2.5,"style":"Khuyên","diameter_mm":20}',
  'Khuyên tròn bạc 925 xi bạch kim, đường kính 2cm, basic dễ phối.', '/img/bong-tai.svg'),
('BT-004','bong-tai-vang-24k-hoa-mai','Bông tai vàng 24K hoa mai',
  (SELECT id FROM categories WHERE slug='bong-tai'), 9800000, 5,
  '{"metal":"Vàng 24K","weight_g":2.9,"style":"Nụ","motif":"Hoa mai"}',
  'Bông tai vàng 9999 họa tiết hoa mai 5 cánh, quà Tết ý nghĩa.', '/img/bong-tai.svg'),
('BT-005','bong-tai-vang-18k-da-cz-dai','Bông tai vàng 18K đá CZ dáng dài',
  (SELECT id FROM categories WHERE slug='bong-tai'), 5600000, 7,
  '{"metal":"Vàng 18K","weight_g":2.4,"stone":"CZ","style":"Thả dài","length_mm":35}',
  'Bông tai thả dài đính CZ, lấp lánh khi dự tiệc.', '/img/bong-tai.svg'),
-- Dây chuyền
('DC-001','day-chuyen-vang-18k-kieu-y-45cm','Dây chuyền vàng 18K kiểu Ý 45cm',
  (SELECT id FROM categories WHERE slug='day-chuyen'), 15200000, 6,
  '{"metal":"Vàng 18K","weight_g":4.8,"length_cm":45,"style":"Kiểu Ý","clasp":"Móc tôm"}',
  'Dây chuyền vàng 18K đan kiểu Ý, mềm mại, dài 45cm, móc tôm chắc chắn.', '/img/day-chuyen.svg'),
('DC-002','day-chuyen-vang-24k-10-chi','Dây chuyền vàng 24K 10 chỉ',
  (SELECT id FROM categories WHERE slug='day-chuyen'), 128000000, 1,
  '{"metal":"Vàng 24K","weight_g":37.5,"length_cm":50,"style":"Xích","gender":"Nam"}',
  'Dây chuyền vàng 9999 10 chỉ kiểu xích, nam tính, có giấy chứng nhận tuổi vàng.', '/img/day-chuyen.svg'),
('DC-003','day-chuyen-bac-925-mat-trai-tim','Dây chuyền bạc 925 mặt trái tim',
  (SELECT id FROM categories WHERE slug='day-chuyen'), 690000, 30,
  '{"metal":"Bạc 925","weight_g":3.2,"length_cm":42,"stone":"CZ","motif":"Trái tim"}',
  'Dây chuyền bạc kèm mặt trái tim đính CZ, quà tặng bạn gái.', '/img/day-chuyen.svg'),
('DC-004','day-chuyen-vang-trang-18k-kim-cuong-tam','Dây chuyền vàng trắng 18K kim cương tấm',
  (SELECT id FROM categories WHERE slug='day-chuyen'), 19900000, 2,
  '{"metal":"Vàng trắng 18K","weight_g":3.6,"length_cm":42,"stone":"Kim cương","carat":0.25}',
  'Dây chuyền vàng trắng kèm mặt tròn đính kim cương tấm 0.25ct tổng.', '/img/day-chuyen.svg'),
('DC-005','day-chuyen-vang-hong-14k-bi','Dây chuyền vàng hồng 14K bi',
  (SELECT id FROM categories WHERE slug='day-chuyen'), 6400000, 9,
  '{"metal":"Vàng hồng 14K","weight_g":2.3,"length_cm":40,"style":"Bi"}',
  'Dây chuyền vàng hồng dạng bi nhỏ, dễ phối mặt dây.', '/img/day-chuyen.svg'),
-- Lắc tay
('LT-001','lac-tay-vang-18k-kim-cuong-tennis','Lắc tay vàng 18K kim cương Tennis',
  (SELECT id FROM categories WHERE slug='lac-tay'), 58000000, 1,
  '{"metal":"Vàng trắng 18K","weight_g":8.2,"length_cm":17,"stone":"Kim cương","carat":2.0,"stone_count":40}',
  'Lắc Tennis 40 viên kim cương tổng 2ct, đẳng cấp.', '/img/lac-tay.svg'),
('LT-002','lac-tay-vang-24k-hinh-rong','Lắc tay vàng 24K hình rồng',
  (SELECT id FROM categories WHERE slug='lac-tay'), 36500000, 2,
  '{"metal":"Vàng 24K","weight_g":11.25,"length_cm":19,"motif":"Rồng","gender":"Nam"}',
  'Lắc tay vàng 9999 3 chỉ họa tiết rồng, phong thuỷ, nam giới.', '/img/lac-tay.svg'),
('LT-003','lac-tay-bac-925-charm','Lắc tay bạc 925 charm',
  (SELECT id FROM categories WHERE slug='lac-tay'), 790000, 22,
  '{"metal":"Bạc 925","weight_g":6.5,"length_cm":18,"style":"Charm"}',
  'Lắc tay bạc charm có thể gắn thêm charm theo sở thích.', '/img/lac-tay.svg'),
('LT-004','lac-tay-vang-18k-da-cz','Lắc tay vàng 18K đá CZ',
  (SELECT id FROM categories WHERE slug='lac-tay'), 9800000, 5,
  '{"metal":"Vàng 18K","weight_g":3.9,"length_cm":17,"stone":"CZ"}',
  'Lắc tay vàng 18K mảnh đính CZ, nhẹ nhàng hằng ngày.', '/img/lac-tay.svg'),
-- Mặt dây
('MD-001','mat-day-kim-cuong-vang-trang-18k','Mặt dây kim cương vàng trắng 18K',
  (SELECT id FROM categories WHERE slug='mat-day'), 17800000, 3,
  '{"metal":"Vàng trắng 18K","weight_g":1.6,"stone":"Kim cương","carat":0.35,"color":"G","clarity":"VS1"}',
  'Mặt dây kim cương 1 viên 4.5 ly, giấy kiểm định GIA.', '/img/mat-day.svg'),
('MD-002','mat-day-vang-18k-phat-ban-menh','Mặt dây vàng 18K Phật bản mệnh',
  (SELECT id FROM categories WHERE slug='mat-day'), 8900000, 6,
  '{"metal":"Vàng 18K","weight_g":3.0,"motif":"Phật bản mệnh","zodiac":"Tuổi Thìn"}',
  'Mặt Phật bản mệnh tuổi Thìn, vàng 18K, bình an may mắn.', '/img/mat-day.svg'),
('MD-003','mat-day-bac-925-chu-cai','Mặt dây bạc 925 chữ cái',
  (SELECT id FROM categories WHERE slug='mat-day'), 290000, 50,
  '{"metal":"Bạc 925","weight_g":1.1,"style":"Chữ cái","letters":["A","B","C","D","H","K","L","M","N","P","T"]}',
  'Mặt dây bạc chữ cái, chọn chữ khi đặt hàng.', '/img/mat-day.svg'),
('MD-004','mat-day-ngoc-cam-thach-vang-18k','Mặt dây ngọc cẩm thạch bọc vàng 18K',
  (SELECT id FROM categories WHERE slug='mat-day'), 12500000, 2,
  '{"metal":"Vàng 18K","weight_g":2.2,"stone":"Cẩm thạch","color":"Xanh lý","origin":"Myanmar"}',
  'Ngọc cẩm thạch Myanmar xanh lý bọc vàng 18K, phong thuỷ.', '/img/mat-day.svg'),
-- Vòng tay
('VT-001','vong-tay-vang-24k-tron-5-chi','Vòng tay vàng 24K trơn 5 chỉ',
  (SELECT id FROM categories WHERE slug='vong-tay'), 64000000, 2,
  '{"metal":"Vàng 24K","weight_g":18.75,"diameter_mm":58,"style":"Trơn"}',
  'Vòng tay vàng 9999 5 chỉ kiểu trơn, tích trữ và trang sức.', '/img/vong-tay.svg'),
('VT-002','vong-tay-cam-thach-xanh','Vòng tay cẩm thạch xanh',
  (SELECT id FROM categories WHERE slug='vong-tay'), 22000000, 1,
  '{"stone":"Cẩm thạch","color":"Xanh","diameter_mm":56,"origin":"Myanmar","certified":true}',
  'Vòng tay cẩm thạch tự nhiên loại A, ni 56, kèm giấy kiểm định.', '/img/vong-tay.svg'),
('VT-003','vong-tay-bac-925-tre-em','Vòng tay bạc 925 trẻ em',
  (SELECT id FROM categories WHERE slug='vong-tay'), 390000, 35,
  '{"metal":"Bạc 925","weight_g":4.0,"diameter_mm":45,"gender":"Trẻ em","bells":true}',
  'Vòng bạc cho bé có lục lạc, bạc ta mềm, an toàn cho da.', '/img/vong-tay.svg'),
('VT-004','vong-tay-vang-18k-kim-cuong-tam','Vòng tay vàng 18K kim cương tấm',
  (SELECT id FROM categories WHERE slug='vong-tay'), 31000000, 2,
  '{"metal":"Vàng 18K","weight_g":7.5,"diameter_mm":58,"stone":"Kim cương","carat":0.5}',
  'Vòng tay vàng 18K đính kim cương tấm quanh vòng, sang trọng.', '/img/vong-tay.svg');

-- ---------------- Sản phẩm sinh tự động (3.000) để benchmark ----------------
-- Tên ghép từ các từ khoá thực tế -> full-text search / trigram có ý nghĩa
INSERT INTO products (sku, slug, name, category_id, price, stock, attributes, description, image_url)
SELECT
  'GEN-' || lpad(g::text, 5, '0'),
  'san-pham-' || g,
  cat.name || ' ' || metal.name || CASE WHEN stone.name IS NULL THEN '' ELSE ' đính ' || stone.name END || ' mẫu ' || g,
  cat.id,
  (round((random() * 40 + 1) * 500000))::numeric(14,0),
  (random() * 20)::int,
  jsonb_strip_nulls(jsonb_build_object(
    'metal',    metal.name,
    'weight_g', round((random() * 8 + 1)::numeric, 2),
    'stone',    stone.name,
    'carat',    CASE WHEN stone.name IN ('Kim cương','Ruby','Sapphire') THEN round((random() * 1.5 + 0.1)::numeric, 2) END,
    'ring_size', CASE WHEN cat.slug IN ('nhan','nhan-cuoi') THEN (random() * 10 + 8)::int END,
    'length_cm', CASE WHEN cat.slug IN ('day-chuyen','lac-tay') THEN (random() * 10 + 40)::int END,
    'gender',   (ARRAY['Nữ','Nam','Unisex'])[1 + (random() * 2)::int]
  )),
  'Sản phẩm ' || cat.name || ' chất liệu ' || metal.name || ', thiết kế tinh tế, bảo hành đánh bóng trọn đời.',
  '/img/' || cat.slug || '.svg'
FROM generate_series(1, 3000) g
JOIN LATERAL (SELECT id, slug, name FROM categories ORDER BY (g * 7919 + id) % 13 LIMIT 1) cat ON true
JOIN LATERAL (SELECT name FROM (VALUES ('Vàng 18K'),('Vàng trắng 18K'),('Vàng 24K'),('Vàng hồng 14K'),('Bạc 925'),('Vàng 14K')) m(name)
              ORDER BY (g * 31 + length(name)) % 7 LIMIT 1) metal ON true
JOIN LATERAL (SELECT name FROM (VALUES ('Kim cương'),('CZ'),('Ngọc trai'),('Ruby'),('Sapphire'),(NULL)) s(name)
              ORDER BY (g * 17 + coalesce(length(name),0)) % 11 LIMIT 1) stone ON true;

-- ---------------- Admin (mật khẩu: admin123, hash bcrypt) ----------------
INSERT INTO admins (username, password_hash, full_name) VALUES
  ('admin', '$2b$10$6qjGZB8hT6ZQ3G9oY5cC3u6l3iJd6h9uVxB4ZbD1tCzT8Lw3C0wfe', 'Quản trị viên');

-- ---------------- Khách hàng (500) ----------------
INSERT INTO customers (full_name, phone, email, address)
SELECT
  (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Võ','Phùng','Đặng','Bùi','Đỗ'])[1 + (random()*9)::int] || ' ' ||
  (ARRAY['Văn','Thị','Minh','Anh','Thanh','Hồng','Quốc','Ngọc'])[1 + (random()*7)::int] || ' ' ||
  (ARRAY['Tuấn','Thông','Lan','Hương','Nam','Hà','Long','Linh','Phúc','Trang'])[1 + (random()*9)::int],
  '09' || lpad(g::text, 8, '0'),
  'khach' || g || '@gmail.com',
  (ARRAY['Quận 1','Quận 3','Bình Thạnh','Thủ Đức','Gò Vấp','Tân Bình'])[1 + (random()*5)::int] || ', TP.HCM'
FROM generate_series(1, 500) g;

-- ---------------- Đơn hàng (~30.000, rải 01/2026 -> 10/2026) ----------------
-- Insert thẳng (không qua place_order) để nhanh; tồn kho không bị trừ cho dữ liệu lịch sử.
INSERT INTO orders (customer_id, status, subtotal, shipping_fee, created_at)
SELECT
  1 + (random() * 499)::int,
  (ARRAY['completed','completed','completed','completed','shipping','confirmed','pending','cancelled'])[1 + (random()*7)::int],
  0, 30000,
  timestamp '2026-01-01' + (random() * (interval '290 days'))
FROM generate_series(1, 30000);

-- Mỗi đơn 1-2 dòng sản phẩm (sản phẩm viết tay id 1..40 được ưu tiên để top bán chạy "đẹp")
INSERT INTO order_items (order_id, order_created_at, product_id, qty, unit_price)
SELECT o.id, o.created_at, p.id, 1 + (random() * 1)::int, p.price
FROM orders o
JOIN LATERAL (
  SELECT id, price FROM products
  WHERE id = CASE WHEN o.id % 3 = 0 THEN 1 + (o.id * 7919) % 40
                  ELSE 1 + (o.id * 7919) % (SELECT count(*) FROM products) END
) p ON true;

INSERT INTO order_items (order_id, order_created_at, product_id, qty, unit_price)
SELECT o.id, o.created_at, p.id, 1, p.price
FROM orders o
JOIN LATERAL (SELECT id, price FROM products WHERE id = 1 + (o.id * 104729) % 40) p ON true
WHERE o.id % 4 = 0;

UPDATE orders SET subtotal = s.sum, shipping_fee = CASE WHEN s.sum >= 5000000 THEN 0 ELSE 30000 END
FROM (SELECT order_id, order_created_at, sum(line_total) AS sum FROM order_items GROUP BY 1, 2) s
WHERE orders.id = s.order_id AND orders.created_at = s.order_created_at;

COMMIT;

-- Cập nhật thống kê cho planner và nạp sẵn materialized view
ANALYZE;
SELECT refresh_sales_reports();
