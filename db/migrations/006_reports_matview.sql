-- =====================================================================
-- 006: TÍNH NĂNG 6 (phần 2) - MATERIALIZED VIEW cho dashboard báo cáo
-- =====================================================================
-- Dashboard admin cần: doanh thu theo ngày, top sản phẩm bán chạy, doanh thu theo danh mục.
-- Tính trực tiếp trên hàng trăm nghìn order_items mỗi lần mở dashboard là lãng phí.
-- MATERIALIZED VIEW lưu sẵn kết quả như 1 bảng, chỉ REFRESH khi cần (sau khi đơn hoàn tất,
-- hoặc mỗi 5 phút). REFRESH ... CONCURRENTLY cần UNIQUE INDEX và không khoá người đọc.
-- =====================================================================

-- Doanh thu theo ngày (chỉ tính đơn không bị huỷ)
CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT
  date_trunc('day', o.created_at)::date AS day,
  count(*)                              AS orders,
  sum(o.total)                          AS revenue,
  sum(oi.qty)                           AS items_sold
FROM orders o
JOIN order_items oi ON oi.order_id = o.id AND oi.order_created_at = o.created_at
WHERE o.status <> 'cancelled'
GROUP BY 1
WITH DATA;

CREATE UNIQUE INDEX ON mv_sales_daily (day);

-- Top sản phẩm bán chạy
CREATE MATERIALIZED VIEW mv_top_products AS
SELECT
  p.id AS product_id, p.sku, p.name, p.image_url, c.name AS category,
  sum(oi.qty)        AS qty_sold,
  sum(oi.line_total) AS revenue
FROM order_items oi
JOIN orders o   ON o.id = oi.order_id AND o.created_at = oi.order_created_at
JOIN products p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status <> 'cancelled'
GROUP BY p.id, p.sku, p.name, p.image_url, c.name
ORDER BY qty_sold DESC
WITH DATA;

CREATE UNIQUE INDEX ON mv_top_products (product_id);

-- Doanh thu theo danh mục theo tháng
CREATE MATERIALIZED VIEW mv_sales_by_category_month AS
SELECT
  date_trunc('month', o.created_at)::date AS month,
  c.id   AS category_id,
  c.name AS category,
  sum(oi.line_total) AS revenue,
  sum(oi.qty)        AS qty
FROM order_items oi
JOIN orders o     ON o.id = oi.order_id AND o.created_at = oi.order_created_at
JOIN products p   ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status <> 'cancelled'
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX ON mv_sales_by_category_month (month, category_id);

-- Hàm refresh tất cả (API admin gọi, hoặc pg_cron / cron hệ điều hành)
CREATE OR REPLACE FUNCTION refresh_sales_reports() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_products;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_by_category_month;
END $$;

-- ---------------------------------------------------------------------
-- VIEW thường (không materialized) cho những thứ cần real-time
-- ---------------------------------------------------------------------
CREATE VIEW v_low_stock_products AS
SELECT id, sku, name, stock, price, image_url
FROM products
WHERE stock < 3 AND status = 'active'   -- khớp partial index idx_products_low_stock
ORDER BY stock, id;

CREATE VIEW v_order_summary AS
SELECT
  o.id, o.created_at, o.status, o.subtotal, o.shipping_fee, o.total, o.note,
  c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
  (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
FROM orders o
JOIN customers c ON c.id = o.customer_id;
