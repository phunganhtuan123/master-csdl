-- =====================================================================
-- 003: Đơn hàng - TÍNH NĂNG 4: TABLE PARTITIONING theo tháng
-- =====================================================================
-- Bảng orders lớn dần theo thời gian. Chia theo tháng (RANGE trên created_at):
--   * Báo cáo "doanh thu tháng 10" chỉ quét partition orders_2026_10 (partition pruning)
--   * Xoá/lưu trữ đơn cũ = DROP/DETACH 1 partition, không DELETE từng dòng
--   * VACUUM, index nhỏ hơn, chạy nhanh hơn
-- Lưu ý: khoá chính của bảng partition phải chứa cột partition -> PRIMARY KEY (id, created_at)
-- =====================================================================

CREATE TABLE orders (
  id           BIGSERIAL,
  customer_id  BIGINT NOT NULL REFERENCES customers(id),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','confirmed','shipping','completed','cancelled')),
  subtotal     NUMERIC(14,0) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(14,0) NOT NULL DEFAULT 0,
  -- GENERATED COLUMN: tổng tiền do PostgreSQL tự tính, app không thể ghi sai
  total        NUMERIC(14,0) GENERATED ALWAYS AS (subtotal + shipping_fee) STORED,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Tạo sẵn partition cho 12 tháng của năm 2026 + partition mặc định (hứng dữ liệu ngoài khoảng)
DO $$
DECLARE m INT;
BEGIN
  FOR m IN 1..12 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS orders_2026_%s PARTITION OF orders
         FOR VALUES FROM (%L) TO (%L)',
      lpad(m::text, 2, '0'),
      make_date(2026, m, 1),
      make_date(2026, m, 1) + interval '1 month'
    );
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS orders_default PARTITION OF orders DEFAULT;

-- Hàm tiện ích: tạo partition cho tháng bất kỳ (gọi từ cron hoặc admin)
CREATE OR REPLACE FUNCTION ensure_orders_partition(p_month DATE)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_start DATE := date_trunc('month', p_month)::date;
  v_name  TEXT := format('orders_%s', to_char(v_start, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
    v_name, v_start, v_start + interval '1 month');
  RETURN v_name;
END $$;

-- ---------------------------------------------------------------------
-- order_items: chi tiết đơn hàng
-- FK tới bảng partition phải trỏ vào đủ (id, created_at) nên lưu thêm order_created_at
-- ---------------------------------------------------------------------
CREATE TABLE order_items (
  id               BIGSERIAL PRIMARY KEY,
  order_id         BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  product_id       BIGINT NOT NULL REFERENCES products(id),
  qty              INT NOT NULL CHECK (qty > 0),
  unit_price       NUMERIC(14,0) NOT NULL,          -- giá tại thời điểm mua (giá sản phẩm có thể đổi sau)
  line_total       NUMERIC(14,0) GENERATED ALWAYS AS (qty * unit_price) STORED,
  FOREIGN KEY (order_id, order_created_at) REFERENCES orders(id, created_at) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- stock_movements: nhật ký xuất/nhập kho (truy vết vì sao tồn kho thay đổi)
-- ---------------------------------------------------------------------
CREATE TABLE stock_movements (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  delta      INT NOT NULL,                       -- âm = xuất bán, dương = nhập hàng / huỷ đơn
  reason     TEXT NOT NULL,                      -- 'order', 'cancel', 'import', 'adjust'
  ref_id     BIGINT,                             -- id đơn hàng liên quan (nếu có)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
