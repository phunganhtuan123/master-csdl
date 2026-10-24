-- =====================================================================
-- 005: TÍNH NĂNG 5 - ĐẶT HÀNG AN TOÀN: TRANSACTION + SELECT ... FOR UPDATE
-- =====================================================================
-- Vấn đề: trang sức thường tồn kho ít (1 mẫu nhẫn chỉ 1-2 chiếc). Hai khách bấm
-- "Đặt hàng" cùng lúc, nếu app chỉ SELECT stock rồi UPDATE thì cả hai đều thấy
-- stock=1 và cả hai cùng mua được -> bán quá kho (oversell).
--
-- Giải pháp PostgreSQL:
--   1. Toàn bộ đặt hàng nằm trong 1 hàm PL/pgSQL = 1 transaction (atomic: hoặc tất cả hoặc không gì cả)
--   2. SELECT ... FOR UPDATE khoá đúng những dòng sản phẩm đang mua. Giao dịch thứ hai
--      phải CHỜ giao dịch thứ nhất commit, sau đó đọc lại stock đã trừ -> thấy hết hàng -> RAISE
--   3. ORDER BY id khi khoá để 2 giao dịch luôn khoá theo cùng thứ tự -> không deadlock
--   4. CHECK (stock >= 0) trên bảng là hàng rào cuối cùng.
-- =====================================================================

CREATE OR REPLACE FUNCTION place_order(
  p_customer  JSONB,    -- {"full_name":"...","phone":"...","email":"...","address":"..."}
  p_items     JSONB,    -- [{"product_id":1,"qty":1},{"product_id":5,"qty":2}]
  p_note      TEXT DEFAULT NULL
)
RETURNS TABLE (order_id BIGINT, order_total NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE
  v_customer_id BIGINT;
  v_order_id    BIGINT;
  v_created_at  TIMESTAMPTZ := now();
  v_subtotal    NUMERIC(14,0) := 0;
  v_shipping    NUMERIC(14,0);
  r             RECORD;
BEGIN
  -- (1) Upsert khách hàng theo số điện thoại
  INSERT INTO customers (full_name, phone, email, address)
  VALUES (p_customer->>'full_name', p_customer->>'phone', p_customer->>'email', p_customer->>'address')
  ON CONFLICT (phone) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email     = COALESCE(EXCLUDED.email, customers.email),
        address   = COALESCE(EXCLUDED.address, customers.address)
  RETURNING id INTO v_customer_id;

  -- (2) Khoá các dòng sản phẩm sẽ mua (FOR UPDATE), theo thứ tự id để tránh deadlock
  --     Đồng thời kiểm tra tồn kho ngay sau khi có khoá (lúc này không ai khác sửa được stock)
  FOR r IN
    SELECT p.id, p.name, p.price, p.stock, i.qty
    FROM jsonb_to_recordset(p_items) AS i(product_id BIGINT, qty INT)
    JOIN products p ON p.id = i.product_id
    WHERE p.status = 'active'
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF r.stock < r.qty THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: "%" chỉ còn % sản phẩm, bạn đặt %', r.name, r.stock, r.qty
        USING ERRCODE = 'check_violation';
    END IF;
    v_subtotal := v_subtotal + r.price * r.qty;
  END LOOP;

  IF v_subtotal = 0 THEN
    RAISE EXCEPTION 'EMPTY_ORDER: giỏ hàng trống hoặc sản phẩm không còn bán';
  END IF;

  -- Miễn phí ship cho đơn >= 5 triệu
  v_shipping := CASE WHEN v_subtotal >= 5000000 THEN 0 ELSE 30000 END;

  -- (3) Tạo đơn (total là generated column, PostgreSQL tự tính)
  INSERT INTO orders (customer_id, status, subtotal, shipping_fee, note, created_at)
  VALUES (v_customer_id, 'pending', v_subtotal, v_shipping, p_note, v_created_at)
  RETURNING id INTO v_order_id;

  -- (4) Chi tiết đơn, ghi giá tại thời điểm mua
  INSERT INTO order_items (order_id, order_created_at, product_id, qty, unit_price)
  SELECT v_order_id, v_created_at, p.id, i.qty, p.price
  FROM jsonb_to_recordset(p_items) AS i(product_id BIGINT, qty INT)
  JOIN products p ON p.id = i.product_id;

  -- (5) Trừ kho + ghi nhật ký kho (trigger ở dưới sẽ bắn NOTIFY nếu sắp hết hàng)
  UPDATE products p
  SET stock = p.stock - i.qty
  FROM jsonb_to_recordset(p_items) AS i(product_id BIGINT, qty INT)
  WHERE p.id = i.product_id;

  INSERT INTO stock_movements (product_id, delta, reason, ref_id)
  SELECT i.product_id, -i.qty, 'order', v_order_id
  FROM jsonb_to_recordset(p_items) AS i(product_id BIGINT, qty INT);

  RETURN QUERY SELECT v_order_id, v_subtotal + v_shipping;
END $$;

-- ---------------------------------------------------------------------
-- Huỷ đơn: trả lại kho, cũng là 1 transaction
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_order(p_order_id BIGINT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: đơn % không tồn tại', p_order_id;
  END IF;
  IF v_status NOT IN ('pending','confirmed') THEN
    RAISE EXCEPTION 'INVALID_STATUS: đơn đang ở trạng thái %, không huỷ được', v_status;
  END IF;

  UPDATE products p SET stock = p.stock + oi.qty
  FROM order_items oi WHERE oi.order_id = p_order_id AND oi.product_id = p.id;

  INSERT INTO stock_movements (product_id, delta, reason, ref_id)
  SELECT product_id, qty, 'cancel', p_order_id FROM order_items WHERE order_id = p_order_id;

  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
END $$;

-- =====================================================================
-- TÍNH NĂNG 6 (phần 1) - LISTEN / NOTIFY: cảnh báo real-time cho admin
-- =====================================================================
-- Trigger bắn thông báo trên kênh 'low_stock' khi stock giảm xuống dưới 3.
-- Backend Node.js LISTEN kênh này và đẩy sang trình duyệt admin qua SSE,
-- không cần polling, không cần Redis/RabbitMQ.
-- =====================================================================
CREATE OR REPLACE FUNCTION notify_low_stock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock < 3 AND NEW.stock < OLD.stock THEN
    PERFORM pg_notify('low_stock', json_build_object(
      'product_id', NEW.id, 'sku', NEW.sku, 'name', NEW.name,
      'stock', NEW.stock, 'at', now())::text);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_products_low_stock
AFTER UPDATE OF stock ON products
FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- Thông báo đơn hàng mới cho dashboard admin
CREATE OR REPLACE FUNCTION notify_new_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('new_order', json_build_object(
    'order_id', NEW.id, 'total', NEW.total, 'customer_id', NEW.customer_id, 'at', NEW.created_at)::text);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_orders_new
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION notify_new_order();
