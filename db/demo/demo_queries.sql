-- =====================================================================
-- DEMO QUERIES - mở file này trong DBeaver (kết nối localhost:5432, db jewelry, postgres/postgres)
-- Chọn từng khối rồi bấm Ctrl+Enter (Cmd+Enter trên Mac) để chạy.
-- Mỗi mục = 1 tính năng PostgreSQL gắn với 1 nghiệp vụ. Số thứ tự trùng với chương 3 tiểu luận.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Tổng quan dữ liệu
-- ---------------------------------------------------------------------
SELECT (SELECT count(*) FROM products)    AS san_pham,
       (SELECT count(*) FROM orders)      AS don_hang,
       (SELECT count(*) FROM order_items) AS chi_tiet_don,
       (SELECT count(*) FROM customers)   AS khach_hang,
       (SELECT count(*) FROM pg_inherits WHERE inhparent = 'orders'::regclass) AS so_partition,
       pg_size_pretty(pg_database_size(current_database())) AS dung_luong_db;

-- Các extension đang bật
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','pg_trgm','unaccent','pg_stat_statements');


-- ---------------------------------------------------------------------
-- 1. JSONB - thuộc tính sản phẩm linh hoạt
-- ---------------------------------------------------------------------
-- Mỗi loại trang sức có bộ thuộc tính khác nhau, cùng nằm trong 1 cột
SELECT sku, name, attributes
FROM products WHERE sku IN ('NK-001', 'DC-002', 'VT-002');

-- Lọc theo thuộc tính bằng toán tử @> (dùng GIN index idx_products_attributes)
SELECT sku, name, price, attributes->>'carat' AS carat
FROM products
WHERE attributes @> '{"metal":"Vàng trắng 18K","stone":"Kim cương"}'
ORDER BY price DESC LIMIT 10;

-- Thống kê theo giá trị trong JSONB (bộ lọc bên trái trang web lấy từ đây)
SELECT attributes->>'metal' AS chat_lieu, count(*) AS so_sp, round(avg(price)) AS gia_tb
FROM products WHERE attributes ? 'metal'
GROUP BY 1 ORDER BY 2 DESC;

-- Kế hoạch thực thi: Bitmap Index Scan on idx_products_attributes
EXPLAIN (ANALYZE, COSTS OFF)
SELECT count(*) FROM products WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}';


-- ---------------------------------------------------------------------
-- 2. FULL-TEXT SEARCH tiếng Việt (unaccent + tsvector + pg_trgm)
-- ---------------------------------------------------------------------
-- Gõ KHÔNG DẤU vẫn tìm ra, có xếp hạng và tô đậm
SELECT name, ts_rank(search_vec, q) AS rank,
       ts_headline('simple', name, q, 'StartSel=<b>, StopSel=</b>') AS highlight
FROM products, plainto_tsquery('simple', vi_unaccent('nhan kim cuong 18k')) q
WHERE search_vec @@ q
ORDER BY rank DESC LIMIT 5;

-- Gõ SAI CHÍNH TẢ -> trigram vẫn tìm được
SELECT name, similarity(vi_unaccent(name), 'nhan kim cuog solitare') AS do_giong
FROM products
WHERE vi_unaccent(name) % 'nhan kim cuog solitare'
ORDER BY do_giong DESC LIMIT 5;

-- Gợi ý khi đang gõ (prefix search)
SELECT name FROM products
WHERE search_vec @@ to_tsquery('simple', vi_unaccent('bong:* & tai:* & ng:*'))
LIMIT 5;

-- Xem tsvector đã bỏ dấu của 1 sản phẩm
SELECT name, search_vec FROM products WHERE sku = 'NK-001';


-- ---------------------------------------------------------------------
-- 3. PGVECTOR - sản phẩm tương tự (HNSW index)
-- ---------------------------------------------------------------------
-- 8 sản phẩm "giống" nhẫn NK-001 nhất, <=> = khoảng cách cosine
SELECT p.sku, p.name, p.price,
       round((1 - (p.embedding <=> me.embedding))::numeric, 3) AS do_tuong_dong
FROM products p, (SELECT embedding FROM products WHERE sku = 'NK-001') me
WHERE p.sku <> 'NK-001' AND p.status = 'active'
ORDER BY p.embedding <=> me.embedding
LIMIT 8;

-- Vector 256 chiều trông như thế nào (xem 10 số đầu)
SELECT sku, left(embedding::text, 80) || '...' AS embedding FROM products WHERE sku = 'NK-001';

-- Kế hoạch: Index Scan using idx_products_embedding (HNSW)
EXPLAIN (ANALYZE, COSTS OFF)
SELECT name FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku='NK-001') LIMIT 8;


-- ---------------------------------------------------------------------
-- 4. PARTITIONING theo tháng + BRIN
-- ---------------------------------------------------------------------
-- Danh sách partition và số dòng từng tháng
SELECT c.relname AS partition, pg_size_pretty(pg_relation_size(c.oid)) AS size,
       s.n_live_tup AS so_don
FROM pg_inherits h
JOIN pg_class c ON c.oid = h.inhrelid
JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE h.inhparent = 'orders'::regclass
ORDER BY c.relname;

-- Partition pruning: chỉ quét 1 partition (xem "Seq Scan on orders_2026_09")
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(*), sum(total) FROM orders
WHERE created_at >= '2026-09-01' AND created_at < '2026-09-15';

-- Tắt pruning để so sánh: phải Append toàn bộ partition
BEGIN;
SET LOCAL enable_partition_pruning = off;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT count(*), sum(total) FROM orders
WHERE created_at >= '2026-09-01' AND created_at < '2026-09-15';
ROLLBACK;

-- Kích thước BRIN so với B-tree trên cùng cột created_at
CREATE INDEX tmp_btree ON orders (created_at);
SELECT 'BRIN'   AS loai, pg_size_pretty(sum(pg_relation_size(inhrelid))) AS kich_thuoc FROM pg_inherits WHERE inhparent = 'idx_orders_created_brin'::regclass
UNION ALL
SELECT 'B-tree', pg_size_pretty(sum(pg_relation_size(inhrelid)))               FROM pg_inherits WHERE inhparent = 'tmp_btree'::regclass;
DROP INDEX tmp_btree;

-- Tạo partition cho tháng mới chỉ 1 lệnh
SELECT ensure_orders_partition('2027-01-01');


-- ---------------------------------------------------------------------
-- 5. TRANSACTION + SELECT ... FOR UPDATE - không bán quá tồn kho
-- ---------------------------------------------------------------------
-- Đặt tồn kho = 1 cho nhẫn Solitaire
UPDATE products SET stock = 1 WHERE sku = 'NK-002';

-- Đặt hàng thành công (gọi hàm PL/pgSQL, toàn bộ là 1 transaction)
SELECT * FROM place_order(
  '{"full_name":"Khách demo A","phone":"0900000001","address":"Q1, TP.HCM"}',
  '[{"product_id": 2, "qty": 1}]', 'demo DBeaver');

-- Khách thứ 2 mua cùng chiếc -> lỗi OUT_OF_STOCK (kho đã = 0, không bao giờ âm)
SELECT * FROM place_order(
  '{"full_name":"Khách demo B","phone":"0900000002"}',
  '[{"product_id": 2, "qty": 1}]');

-- Kiểm tra kho và nhật ký kho
SELECT sku, name, stock FROM products WHERE sku = 'NK-002';
SELECT * FROM stock_movements WHERE product_id = 2 ORDER BY id DESC LIMIT 3;

-- DEMO 2 PHIÊN ĐỒNG THỜI (mở 2 tab SQL trong DBeaver, tắt auto-commit):
--   Tab 1: BEGIN; SELECT stock FROM products WHERE id = 2 FOR UPDATE;   -- giữ khoá, CHƯA commit
--   Tab 2: SELECT * FROM place_order('{"full_name":"C","phone":"0900000003"}','[{"product_id":2,"qty":1}]');
--          -> Tab 2 bị CHỜ cho đến khi Tab 1 COMMIT/ROLLBACK
--   Tab 1: ROLLBACK;  -> Tab 2 chạy tiếp và báo OUT_OF_STOCK vì kho = 0

-- Huỷ đơn: trả lại kho trong 1 transaction
SELECT cancel_order((SELECT max(id) FROM orders WHERE note = 'demo DBeaver'));
SELECT sku, stock FROM products WHERE sku = 'NK-002';


-- ---------------------------------------------------------------------
-- 6. MATERIALIZED VIEW + LISTEN/NOTIFY
-- ---------------------------------------------------------------------
-- Dashboard đọc từ view đã tính sẵn: micro-giây
SELECT * FROM mv_sales_daily ORDER BY day DESC LIMIT 7;
SELECT name, qty_sold, revenue FROM mv_top_products LIMIT 5;

-- So với tính trực tiếp trên hơn 1 triệu dòng: xem Execution Time
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
SELECT oi.product_id, sum(oi.qty) FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.created_at = oi.order_created_at
WHERE o.status <> 'cancelled' GROUP BY 1 ORDER BY 2 DESC LIMIT 10;

-- Làm mới không chặn người đọc
SELECT refresh_sales_reports();

-- LISTEN/NOTIFY: trong DBeaver chạy LISTEN rồi UPDATE, hoặc nhìn thông báo hiện trên trang /admin
LISTEN low_stock;
UPDATE products SET stock = 2 WHERE sku = 'NK-007';   -- trigger bắn pg_notify('low_stock', ...)
UPDATE products SET stock = 5 WHERE sku = 'NK-007';   -- trả lại


-- ---------------------------------------------------------------------
-- 7. Các index khác: partial, covering, expression
-- ---------------------------------------------------------------------
-- Partial index: đơn chờ xử lý trên 1 triệu đơn - Index Scan trên index 17 MB
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, created_at FROM orders WHERE status IN ('pending','confirmed') ORDER BY created_at DESC LIMIT 20;

-- Covering index: Index Only Scan, Heap Fetches: 0
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id, status, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;

-- Expression index: lower(email)
EXPLAIN (COSTS OFF) SELECT id FROM customers WHERE lower(email) = 'khach123@gmail.com';

-- Generated column: total do PostgreSQL tự tính, không UPDATE được
SELECT id, subtotal, shipping_fee, total FROM orders ORDER BY created_at DESC LIMIT 3;
-- UPDATE orders SET total = 0 WHERE id = 1;   -- báo lỗi: column "total" can only be updated to DEFAULT


-- ---------------------------------------------------------------------
-- 8. Giám sát
-- ---------------------------------------------------------------------
-- Câu SQL tốn thời gian nhất
SELECT left(query, 90) AS query, calls, round(total_exec_time::numeric, 1) AS total_ms, round(mean_exec_time::numeric, 3) AS mean_ms
FROM pg_stat_statements WHERE query NOT ILIKE '%pg_stat%'
ORDER BY total_exec_time DESC LIMIT 10;

-- Index nào được dùng, index nào vô dụng (idx_scan = 0)
SELECT i.indexrelname AS index, i.relname AS bang, am.amname AS loai,
       pg_size_pretty(pg_relation_size(i.indexrelid)) AS size, i.idx_scan AS luot_dung
FROM pg_stat_user_indexes i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_am am ON am.oid = c.relam
WHERE i.relname IN ('products', 'customers')
ORDER BY i.idx_scan DESC;
