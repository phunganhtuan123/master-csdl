-- Kiểm chứng chống bán quá kho: đặt stock = 5 cho 1 sản phẩm, 50 client cùng mua 1 chiếc.
-- Kỳ vọng: đúng 5 đơn thành công, 45 lỗi OUT_OF_STOCK, stock cuối = 0, không bao giờ âm.
-- Chạy: bash db/benchmark/run_bench.sh oversell
\set cid random(1, 500)
SELECT * FROM place_order(
  json_build_object('full_name', 'Khách test', 'phone', '0888' || lpad(:cid::text, 6, '0'))::jsonb,
  '[{"product_id": 2, "qty": 1}]'::jsonb, 'oversell-test');
