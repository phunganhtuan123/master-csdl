-- =====================================================================
-- EXPLAIN ANALYZE trước/sau cho từng loại index - chụp kết quả đưa vào tiểu luận
-- Chạy: psql $DATABASE_URL -f db/benchmark/explain_before_after.sql > benchmark_result.txt
-- Cách so sánh: cùng 1 câu SQL, lần 1 bình thường (planner chọn index),
--               lần 2 tắt loại scan tương ứng bằng SET LOCAL để ép planner quét bảng.
-- =====================================================================
\timing on
\pset pager off
VACUUM ANALYZE;

\echo '=============== 1. JSONB @> với GIN (jsonb_path_ops) ==============='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*) FROM products WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}';
BEGIN; SET LOCAL enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*) FROM products WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}';
ROLLBACK;

\echo '=============== 2. Full-text search tiếng Việt (GIN tsvector) ==============='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn kim cương 18k')) LIMIT 20;
BEGIN; SET LOCAL enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn kim cương 18k')) LIMIT 20;
ROLLBACK;

\echo '=============== 3. Trigram - gõ sai chính tả ==============='
SELECT name, similarity(vi_unaccent(name), 'nhan kim cuog solitare') AS sim
FROM products WHERE vi_unaccent(name) % 'nhan kim cuog solitare' ORDER BY sim DESC LIMIT 5;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products WHERE vi_unaccent(name) % 'nhan kim cuog solitare';
BEGIN; SET LOCAL enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products WHERE vi_unaccent(name) % 'nhan kim cuog solitare';
ROLLBACK;

\echo '=============== 4. pgvector HNSW - sản phẩm tương tự ==============='
SELECT name, round((1 - (embedding <=> (SELECT embedding FROM products WHERE sku='NK-001')))::numeric, 3) AS similarity
FROM products WHERE sku <> 'NK-001' ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku='NK-001') LIMIT 5;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku='NK-001') LIMIT 8;
BEGIN; SET LOCAL enable_indexscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku='NK-001') LIMIT 8;
ROLLBACK;

\echo '=============== 5. Partition pruning + BRIN ==============='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-10-01' AND created_at < '2026-10-15';
BEGIN; SET LOCAL enable_partition_pruning = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-10-01' AND created_at < '2026-10-15';
ROLLBACK;
-- Kích thước BRIN so với B-tree trên cùng cột
CREATE INDEX tmp_orders_created_btree ON orders (created_at);
SELECT 'BRIN'   AS type, pg_size_pretty(sum(pg_relation_size(inhrelid))) AS size FROM pg_inherits WHERE inhparent = 'idx_orders_created_brin'::regclass
UNION ALL
SELECT 'B-tree', pg_size_pretty(sum(pg_relation_size(inhrelid))) FROM pg_inherits WHERE inhparent = 'tmp_orders_created_btree'::regclass;
DROP INDEX tmp_orders_created_btree;

\echo '=============== 6. Covering index (INCLUDE) -> Index Only Scan ==============='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, status, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC;
BEGIN; SET LOCAL enable_indexonlyscan = off;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, status, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC;
ROLLBACK;

\echo '=============== 7. Partial index - sắp hết hàng ==============='
SELECT pg_size_pretty(pg_relation_size('idx_products_low_stock')) AS partial_index_size,
       pg_size_pretty(pg_relation_size('products_pkey'))          AS full_pk_size;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT id, name, stock FROM products WHERE stock < 3 AND status = 'active' ORDER BY stock LIMIT 20;

\echo '=============== 8. Materialized view vs tính trực tiếp ==============='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT day, revenue FROM mv_sales_daily WHERE day >= current_date - 30 ORDER BY day;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT date_trunc('day', o.created_at)::date, sum(o.total)
FROM orders o WHERE o.created_at >= current_date - 30 AND o.status <> 'cancelled' GROUP BY 1 ORDER BY 1;

\echo '=============== 9. Expression index lower(email) ==============='
EXPLAIN (ANALYZE, COSTS OFF) SELECT id FROM customers WHERE lower(email) = lower('Khach123@Gmail.com');

\echo '=============== Kích thước tất cả index trên products ==============='
SELECT indexrelname AS index, pg_size_pretty(pg_relation_size(indexrelid)) AS size, idx_scan
FROM pg_stat_user_indexes WHERE relname = 'products' ORDER BY pg_relation_size(indexrelid) DESC;
