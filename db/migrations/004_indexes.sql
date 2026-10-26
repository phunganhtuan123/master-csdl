-- =====================================================================
-- 004: INDEX - mỗi index gắn với 1 truy vấn cụ thể của ứng dụng
-- =====================================================================
-- Xem benchmark trước/sau trong db/benchmark/explain_before_after.sql
-- =====================================================================

-- ---------- B-tree thông thường (khoá ngoại + lọc danh sách) ----------
-- Trang danh mục: WHERE category_id = ? AND status='active' ORDER BY price
CREATE INDEX idx_products_category_price ON products (category_id, price)
  WHERE status = 'active';

CREATE INDEX idx_order_items_order   ON order_items (order_id, order_created_at);
CREATE INDEX idx_order_items_product ON order_items (product_id);
CREATE INDEX idx_stock_movements_product ON stock_movements (product_id, created_at DESC);

-- ---------- 1. GIN trên JSONB ----------
-- Lọc theo thuộc tính: WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}'
-- jsonb_path_ops: index nhỏ hơn, nhanh hơn cho toán tử @> (chỉ hỗ trợ @>, không hỗ trợ ? ?| ?&)
CREATE INDEX idx_products_attributes ON products USING GIN (attributes jsonb_path_ops);

-- ---------- 2. GIN trên tsvector (Full-text search) ----------
-- WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn kim cương 18k'))
CREATE INDEX idx_products_search_vec ON products USING GIN (search_vec);

-- ---------- 3. GIN trigram (tìm gần đúng, gõ sai chính tả) ----------
-- WHERE vi_unaccent(name) % 'nhan kim cuog'   (toán tử % = similarity > ngưỡng)
-- hoặc vi_unaccent(name) ILIKE '%kim cuong%'  (trigram tăng tốc cả LIKE %...%)
CREATE INDEX idx_products_name_trgm ON products USING GIN (vi_unaccent(name) gin_trgm_ops);

-- ---------- 4. HNSW cho pgvector ----------
-- ORDER BY embedding <=> $1 LIMIT 8   (<=> = khoảng cách cosine)
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);

-- ---------- 5. BRIN trên cột thời gian của bảng lớn ----------
-- orders ghi theo thứ tự thời gian -> created_at tương quan với vị trí vật lý -> BRIN cực nhỏ
-- (vài KB thay vì vài chục MB của B-tree) mà vẫn lọc nhanh theo khoảng ngày.
CREATE INDEX idx_orders_created_brin ON orders USING BRIN (created_at);

-- ---------- 6. COVERING index (INCLUDE) -> Index-Only Scan ----------
-- Lịch sử mua của khách: SELECT id, status, total FROM orders WHERE customer_id=? ORDER BY created_at DESC
-- Mọi cột cần lấy (id, status, total) đều nằm trong index -> Index Only Scan, không phải đọc bảng (heap)
CREATE INDEX idx_orders_customer_cover ON orders (customer_id, created_at DESC)
  INCLUDE (id, status, total);

-- ---------- 7. PARTIAL index ----------
-- Dashboard "sắp hết hàng": chỉ index những dòng stock < 3 -> index rất nhỏ
CREATE INDEX idx_products_low_stock ON products (stock, id)
  WHERE stock < 3 AND status = 'active';

-- Đơn đang chờ xử lý (admin xem mỗi ngày) - đơn completed/cancelled không vào index
CREATE INDEX idx_orders_pending ON orders (created_at DESC)
  WHERE status IN ('pending','confirmed');

-- ---------- 8. EXPRESSION index ----------
-- Tìm khách theo email không phân biệt hoa thường: WHERE lower(email) = lower(?)
CREATE INDEX idx_customers_email_lower ON customers (lower(email));
CREATE INDEX idx_customers_phone_trgm  ON customers USING GIN (phone gin_trgm_ops);
