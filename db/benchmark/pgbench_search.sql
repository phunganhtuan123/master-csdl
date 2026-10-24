-- pgbench: tải đọc - full-text search + lọc JSONB + gợi ý vector
-- Chạy: pgbench -n -c 20 -j 4 -T 20 -f db/benchmark/pgbench_search.sql $DATABASE_URL
\set pid random(1, 40)
SELECT id FROM products WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn vàng 18k')) LIMIT 12;
SELECT id FROM products WHERE attributes @> '{"metal":"Vàng 18K"}' AND status='active' ORDER BY price LIMIT 12;
SELECT id FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE id = :pid) LIMIT 8;
