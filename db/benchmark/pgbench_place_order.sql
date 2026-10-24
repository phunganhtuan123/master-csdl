-- pgbench: 50 khách cùng đặt hàng ngẫu nhiên -> đo TPS của place_order()
-- Chạy: pgbench -n -c 50 -j 4 -T 20 -f db/benchmark/pgbench_place_order.sql $DATABASE_URL
-- chỉ sản phẩm sinh tự động (run_bench.sh nạp thêm kho trước khi chạy)
\set pid random(41, 3033)
\set cid random(1, 500)
SELECT * FROM place_order(
  json_build_object('full_name', 'Khách bench', 'phone', '0999' || lpad(:cid::text, 6, '0'))::jsonb,
  json_build_array(json_build_object('product_id', :pid, 'qty', 1))::jsonb,
  'pgbench');
