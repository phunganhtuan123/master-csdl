const H = require('./helpers');
const { P, RP, H1, H2, H3, bullets, numbered, code, figure, table, pageBreak } = H;

function chapter3() {
  return [
    H1('Chương 3: Các tính năng nổi bật của PostgreSQL áp dụng trong hệ thống'),
    RP('Chương này trình bày 6 tính năng được chọn, mỗi tính năng theo cùng một cấu trúc: bài toán nghiệp vụ → cách PostgreSQL giải quyết → mã SQL thực tế trong hệ thống → kết quả. Các số liệu đo được tổng hợp ở chương 5.'),

    // ---------------------------------------------------------------- 3.1 JSONB
    H2('3.1. JSONB – thuộc tính sản phẩm linh hoạt'),
    H3('3.1.1. Bài toán'),
    RP('Nhẫn có ni (size), carat, nước màu, độ sạch; dây chuyền có chiều dài; bông tai có kiểu khoá; vòng cẩm thạch có đường kính và giấy kiểm định. Nếu dùng mô hình quan hệ thuần tuý có hai cách: (a) thêm hàng chục cột vào bảng products, phần lớn NULL; (b) tạo bảng EAV (entity–attribute–value) khiến truy vấn phải JOIN nhiều lần và mất kiểu dữ liệu. Cả hai đều khó mở rộng khi cửa hàng nhập loại sản phẩm mới.'),
    H3('3.1.2. Giải pháp PostgreSQL'),
    RP('Kiểu **JSONB** lưu tài liệu JSON dưới dạng nhị phân đã phân tích: truy xuất khoá không cần parse lại, hỗ trợ toán tử chứa `@>`, tồn tại khoá `?`, lấy giá trị `->>`, và quan trọng nhất là **đánh index GIN** được. Lớp `jsonb_path_ops` tạo index nhỏ và nhanh hơn cho toán tử `@>` – đúng nhu cầu lọc “chất liệu = Vàng 18K và đá = Kim cương”.'),
    ...code(`-- 002_core_tables.sql
attributes JSONB NOT NULL DEFAULT '{}'::jsonb,

-- 004_indexes.sql
CREATE INDEX idx_products_attributes ON products USING GIN (attributes jsonb_path_ops);

-- Dữ liệu mẫu: mỗi loại trang sức một bộ thuộc tính
{"metal":"Vàng trắng 18K","weight_g":2.8,"ring_size":12,"stone":"Kim cương","carat":0.5,"color":"F","clarity":"VS1"}
{"metal":"Vàng 24K","weight_g":37.5,"length_cm":50,"style":"Xích","gender":"Nam"}
{"stone":"Cẩm thạch","color":"Xanh","diameter_mm":56,"origin":"Myanmar","certified":true}`),
    RP('Ở tầng API, các tham số lọc trên URL được gom thành một đối tượng JSON rồi so khớp bằng `@>` – một câu SQL duy nhất cho mọi tổ hợp thuộc tính:'),
    ...code(`// api/src/routes/catalog.js
const attrFilter = {};
if (metal)  attrFilter.metal  = metal;
if (stone)  attrFilter.stone  = stone;
if (gender) attrFilter.gender = gender;
where.push(\`p.attributes @> \${add(JSON.stringify(attrFilter))}::jsonb\`);

-- Bộ lọc bên trái trang danh sách cũng lấy từ JSONB:
SELECT attributes->>'metal' AS v, count(*) FROM products
WHERE status='active' AND attributes ? 'metal' GROUP BY 1 ORDER BY 2 DESC;`),
    H3('3.1.3. Kết quả'),
    RP('EXPLAIN ANALYZE cho thấy planner dùng `Bitmap Index Scan on idx_products_attributes`, truy vấn lọc 2 thuộc tính trên 3.033 sản phẩm mất **0,06 ms** so với **1,6 ms** khi quét tuần tự (nhanh hơn ~28 lần). Trang quản trị cho phép thêm/xoá thuộc tính tuỳ ý mà không cần ALTER TABLE (Hình 4.7).'),
    ...figure('10b-admin-benchmark-jsonb.jpg', 3, 'EXPLAIN ANALYZE lọc JSONB có GIN index (trái) và quét tuần tự (phải)'),

    // ---------------------------------------------------------------- 3.2 FTS
    H2('3.2. Full-text search tiếng Việt với unaccent, tsvector và pg_trgm'),
    H3('3.2.1. Bài toán'),
    RP('Khách gõ “nhan kim cuong 18k” (không dấu) phải tìm được “Nhẫn kim cương vàng trắng 18K Halo”; gõ sai “nhan kim cuog solitare” vẫn nên ra “Nhẫn kim cương vàng 18K Solitaire”. `LIKE \'%...%\'` không dùng được index B-tree, không xử lý dấu và không xếp hạng kết quả.'),
    H3('3.2.2. Giải pháp PostgreSQL'),
    RP('PostgreSQL có bộ tìm kiếm toàn văn tích hợp: văn bản được chuyển thành **tsvector** (danh sách từ vựng đã chuẩn hoá kèm vị trí và trọng số), câu hỏi thành **tsquery**, so khớp bằng toán tử `@@`, xếp hạng bằng `ts_rank`, tô đậm bằng `ts_headline`. Vì PostgreSQL chưa có từ điển tiếng Việt, nhóm dùng cấu hình `simple` kết hợp extension **unaccent** để bỏ dấu cả dữ liệu lẫn câu hỏi. Hàm `unaccent()` gốc chỉ là STABLE nên phải bọc thành hàm IMMUTABLE để được dùng trong index và generated column:'),
    ...code(`-- 001_extensions.sql
CREATE OR REPLACE FUNCTION vi_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT lower(public.unaccent('public.unaccent', $1)) $$;

-- 002_core_tables.sql: tsvector là GENERATED COLUMN, tự cập nhật khi INSERT/UPDATE
search_vec TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', vi_unaccent(name)), 'A') ||
  setweight(to_tsvector('simple', vi_unaccent(coalesce(description, ''))), 'B')
) STORED,

-- 004_indexes.sql
CREATE INDEX idx_products_search_vec ON products USING GIN (search_vec);
CREATE INDEX idx_products_name_trgm  ON products USING GIN (vi_unaccent(name) gin_trgm_ops);`),
    RP('Để chịu được lỗi chính tả, nhóm dùng thêm extension **pg_trgm**: chia chuỗi thành các bộ ba ký tự (trigram) và đo độ tương đồng. API tìm kiếm chạy theo hai tầng: tầng 1 full-text (chính xác, có xếp hạng); nếu không có kết quả thì tầng 2 trigram với toán tử `%` (similarity vượt ngưỡng). Cả hai tầng đều chạy trên index GIN.'),
    ...code(`-- Tầng 1: full-text search (api/src/routes/search.js)
SELECT p.name, ts_rank(p.search_vec, q) AS rank,
       ts_headline('simple', p.name, q, 'StartSel=<b>, StopSel=</b>') AS headline
FROM products p, plainto_tsquery('simple', vi_unaccent($1)) q
WHERE p.status = 'active' AND p.search_vec @@ q
ORDER BY rank DESC LIMIT 24;

-- Tầng 2: tìm gần đúng bằng trigram
SELECT p.name, similarity(vi_unaccent(p.name), vi_unaccent($1)) AS rank
FROM products p
WHERE vi_unaccent(p.name) % vi_unaccent($1)
ORDER BY rank DESC LIMIT 24;

-- Gợi ý khi gõ: khớp tiền tố 'nhan:* & kim:*'
WHERE search_vec @@ to_tsquery('simple', vi_unaccent('nhan:* & kim:*'))`),
    H3('3.2.3. Kết quả'),
    RP('Tìm “nhan kim cuong 18k” trả về 3 nhẫn kim cương viết tay xếp đầu rồi đến các mẫu sinh tự động (Hình 3.2); gõ sai “nhan kim cuog solitare” tầng full-text không khớp, tầng trigram tìm đúng “Nhẫn kim cương vàng 18K Solitaire 6 chấu” với similarity 0,44 (Hình 3.3). Thanh tìm kiếm gợi ý sau 200 ms mỗi lần gõ nhờ prefix search. Full-text có index nhanh hơn quét tuần tự ~7 lần, trigram ~2,5 lần.'),
    ...figure('04-tim-kiem-fulltext.jpg', 3, 'Kết quả full-text search với từ khoá không dấu'),
    ...figure('05-tim-kiem-trigram.jpg', 3, 'Gõ sai chính tả – hệ thống tự chuyển sang tìm gần đúng bằng trigram'),

    // ---------------------------------------------------------------- 3.3 pgvector
    H2('3.3. pgvector – gợi ý sản phẩm tương tự'),
    H3('3.3.1. Bài toán'),
    RP('Khi khách xem “Nhẫn kim cương vàng trắng 18K Halo”, cửa hàng muốn gợi ý các sản phẩm “giống”: cùng loại nhẫn, cùng vàng trắng, cùng đính kim cương, giá gần nhau. Quy tắc “cùng danh mục” quá thô; viết tay các điều kiện lọc thì cứng nhắc. Cách tiếp cận hiện đại là biểu diễn mỗi sản phẩm bằng một **vector đặc trưng (embedding)** và tìm các vector gần nhất.'),
    H3('3.3.2. Giải pháp PostgreSQL'),
    RP('Extension **pgvector** bổ sung kiểu `vector(n)`, các toán tử khoảng cách (`<->` Euclid, `<=>` cosine, `<#>` tích vô hướng) và hai loại index tìm láng giềng gần đúng: IVFFlat và **HNSW**. HNSW (Hierarchical Navigable Small World) xây đồ thị nhiều tầng, cho tốc độ truy vấn và độ chính xác cao, không cần huấn luyện trước như IVFFlat. Đây là tính năng khiến PostgreSQL trở thành lựa chọn phổ biến cho ứng dụng AI/RAG trong hai năm gần đây [5].'),
    ...code(`-- 002_core_tables.sql
embedding vector(256),
-- 004_indexes.sql
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);

-- api/src/routes/catalog.js: 8 sản phẩm gần nhất theo khoảng cách cosine
SELECT p.id, p.slug, p.name, p.price,
       round((1 - (p.embedding <=> me.embedding))::numeric, 3) AS similarity
FROM products p, (SELECT id, embedding FROM products WHERE slug = $1) me
WHERE p.id <> me.id AND p.status = 'active' AND p.embedding IS NOT NULL
ORDER BY p.embedding <=> me.embedding
LIMIT 8;`),
    RP('Về phía tạo embedding: trong môi trường sản xuất thường gọi mô hình AI (OpenAI text-embedding, CLIP cho ảnh…). Để tiểu luận chạy được không phụ thuộc dịch vụ ngoài, nhóm cài đặt embedding bằng kỹ thuật **feature hashing** (`api/src/embedding.js`): tách tên, mô tả, danh mục và từng cặp khoá=giá trị của JSONB thành token và bigram, băm mỗi token vào một trong 256 chiều với dấu ±, nhân trọng số (danh mục và thuộc tính ×4, tên ×3, mô tả ×1) rồi chuẩn hoá L2. Hai sản phẩm cùng chất liệu, cùng đá, cùng loại sẽ chia sẻ nhiều token nên vector gần nhau. Lược đồ và truy vấn không thay đổi nếu sau này thay bằng mô hình AI thật – chỉ cần đổi hàm `embedProduct()`.'),
    H3('3.3.3. Kết quả'),
    RP('Với “Nhẫn kim cương vàng trắng 18K Halo”, 8 gợi ý đều là nhẫn vàng trắng 18K đính kim cương (độ tương đồng 61–65 %), trong đó có “Nhẫn kim cương vàng 18K Solitaire” (Hình 3.4). Truy vấn dùng `Index Scan using idx_products_embedding`, 0,25 ms so với 1,4 ms khi tính khoảng cách cho toàn bộ 3.033 vector. Khi thêm/sửa sản phẩm trên trang quản trị, API tính lại embedding và ghi trong cùng câu INSERT/UPDATE.'),
    ...figure('03-chi-tiet-pgvector.jpg', 3, 'Trang chi tiết sản phẩm với khối “Có thể bạn cũng thích” từ pgvector', 14),

    // ---------------------------------------------------------------- 3.4 partition
    H2('3.4. Table partitioning và BRIN index cho bảng đơn hàng'),
    H3('3.4.1. Bài toán'),
    RP('Bảng đơn hàng chỉ tăng, không giảm. Sau vài năm có thể hàng triệu dòng, trong khi nghiệp vụ hằng ngày chỉ chạm tới đơn gần đây: báo cáo “doanh thu tháng này”, danh sách đơn chờ xử lý, lọc theo khoảng ngày. Một bảng khổng lồ làm index B-tree lớn, VACUUM chậm, lưu trữ dữ liệu cũ phải DELETE hàng loạt.'),
    H3('3.4.2. Giải pháp PostgreSQL'),
    RP('**Declarative partitioning** chia bảng thành các partition con theo RANGE/LIST/HASH ngay trong câu CREATE TABLE. Planner thực hiện **partition pruning**: chỉ quét partition có khả năng chứa dữ liệu. Tạo partition mới cho tháng tới chỉ là một CREATE TABLE … PARTITION OF; lưu trữ dữ liệu cũ là DETACH/DROP một partition, tức thời.'),
    ...code(`-- 003_orders_partitioned.sql
CREATE TABLE orders (
  id BIGSERIAL, customer_id BIGINT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (...)),
  subtotal NUMERIC(14,0) NOT NULL DEFAULT 0, shipping_fee NUMERIC(14,0) NOT NULL DEFAULT 0,
  total NUMERIC(14,0) GENERATED ALWAYS AS (subtotal + shipping_fee) STORED,
  note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)            -- khoá chính phải chứa cột phân vùng
) PARTITION BY RANGE (created_at);

-- Tạo sẵn 12 partition tháng của năm 2026 bằng vòng lặp PL/pgSQL
CREATE TABLE orders_2026_10 PARTITION OF orders
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- Hàm tạo partition cho tháng bất kỳ (gọi từ cron hoặc admin)
SELECT ensure_orders_partition('2027-01-01');`),
    RP('Trên cột thời gian của bảng ghi theo thứ tự, nhóm dùng **BRIN (Block Range Index)** thay vì B-tree. BRIN chỉ lưu giá trị min/max của mỗi khoảng 128 trang dữ liệu, nên kích thước gần như không đổi khi bảng lớn lên, trong khi vẫn loại bỏ được hầu hết khối không liên quan khi lọc theo khoảng ngày.'),
    ...code(`CREATE INDEX idx_orders_created_brin ON orders USING BRIN (created_at);

-- Truy vấn báo cáo chỉ quét partition tháng 10 (partition pruning)
SELECT count(*), sum(total) FROM orders
WHERE created_at >= '2026-10-01' AND created_at < '2026-10-15';`),
    H3('3.4.3. Kết quả'),
    RP('Với 35.845 đơn rải trong 10 tháng, EXPLAIN cho thấy khi có pruning planner chỉ quét `orders_2026_10` (0,3 ms); khi tắt pruning phải Append 13 partition (1,7–2 ms) (Hình 3.5). Tổng kích thước BRIN trên 13 partition là **312 kB** so với **1.000 kB** của B-tree tương đương; khoảng cách này càng lớn khi dữ liệu tăng vì BRIN tăng theo số khối chứ không theo số dòng. Trang quản trị hiển thị số dòng và dung lượng từng partition (Hình 3.8).'),
    ...figure('10-admin-benchmark-explain.jpg', 3, 'Partition pruning: chỉ quét orders_2026_10 (trái) so với Append 13 partition (phải)'),

    // ---------------------------------------------------------------- 3.5 transaction
    H2('3.5. Transaction và SELECT … FOR UPDATE – chống bán quá tồn kho'),
    H3('3.5.1. Bài toán'),
    RP('Trang sức tồn kho ít: “Nhẫn kim cương vàng 18K Solitaire” chỉ còn 1 chiếc. Hai khách bấm “Đặt hàng” cùng lúc. Nếu ứng dụng chỉ `SELECT stock` rồi `UPDATE stock = stock - 1`, cả hai giao dịch cùng đọc được stock = 1, cùng cho là đủ, và cả hai cùng tạo đơn – cửa hàng bán 2 chiếc trong khi chỉ có 1. Đây là lỗi **race condition** kinh điển, không thể giải quyết bằng kiểm tra ở tầng ứng dụng.'),
    H3('3.5.2. Giải pháp PostgreSQL'),
    RP('Toàn bộ nghiệp vụ đặt hàng được gói trong **một hàm PL/pgSQL `place_order()`**, tức một giao dịch ACID: hoặc tất cả bước thành công, hoặc không có gì được ghi. Bên trong, câu `SELECT … FOR UPDATE` **khoá đúng những dòng sản phẩm** sắp mua: giao dịch thứ hai chạm tới cùng dòng phải chờ giao dịch thứ nhất COMMIT, sau đó đọc giá trị stock *đã bị trừ* và phát hiện hết hàng. Khoá được lấy theo thứ tự `ORDER BY id` để hai giao dịch mua nhiều sản phẩm luôn khoá cùng thứ tự, tránh deadlock. Ràng buộc `CHECK (stock >= 0)` trên bảng là hàng rào cuối cùng.'),
    ...figure('order_flow.jpg', 3, 'Luồng xử lý trong hàm place_order()', 11),
    ...code(`-- 005_order_transaction.sql (rút gọn)
CREATE OR REPLACE FUNCTION place_order(p_customer JSONB, p_items JSONB, p_note TEXT DEFAULT NULL)
RETURNS TABLE (order_id BIGINT, order_total NUMERIC) LANGUAGE plpgsql AS $$
BEGIN
  -- (1) Upsert khách theo số điện thoại
  INSERT INTO customers (full_name, phone, email, address) VALUES (...)
  ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, ... RETURNING id INTO v_customer_id;

  -- (2) Khoá các dòng sản phẩm (FOR UPDATE), theo thứ tự id để tránh deadlock, rồi kiểm tra tồn
  FOR r IN
    SELECT p.id, p.name, p.price, p.stock, i.qty
    FROM jsonb_to_recordset(p_items) AS i(product_id BIGINT, qty INT)
    JOIN products p ON p.id = i.product_id
    WHERE p.status = 'active'
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF r.stock < r.qty THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: "%" chỉ còn % sản phẩm, bạn đặt %', r.name, r.stock, r.qty;
    END IF;
    v_subtotal := v_subtotal + r.price * r.qty;
  END LOOP;

  -- (3)(4) Tạo đơn + chi tiết (lưu giá tại thời điểm mua)
  INSERT INTO orders (...) VALUES (...) RETURNING id INTO v_order_id;
  INSERT INTO order_items (...) SELECT ... FROM jsonb_to_recordset(p_items) ...;

  -- (5) Trừ kho + nhật ký kho (trigger sẽ bắn NOTIFY nếu sắp hết)
  UPDATE products p SET stock = p.stock - i.qty FROM jsonb_to_recordset(p_items) AS i(...) WHERE p.id = i.product_id;
  INSERT INTO stock_movements (product_id, delta, reason, ref_id) SELECT i.product_id, -i.qty, 'order', v_order_id FROM ...;

  RETURN QUERY SELECT v_order_id, v_subtotal + v_shipping;
END $$;`),
    RP('Tầng API chỉ còn một câu SQL; thông điệp lỗi do PL/pgSQL RAISE được chuyển thẳng về giao diện với mã HTTP 409:'),
    ...code(`// api/src/routes/orders.js
const row = await one('SELECT * FROM place_order($1::jsonb, $2::jsonb, $3)',
  [JSON.stringify(customer), JSON.stringify(cleanItems), note ?? null]);
// ... catch (err) { if (/^(OUT_OF_STOCK|EMPTY_ORDER)/.test(err.message)) reply.code(409).send({ error: ... }) }`),
    H3('3.5.3. Kết quả'),
    RP('Kịch bản kiểm chứng (`db/benchmark/oversell_test.sql`): đặt stock = 5 cho một sản phẩm, dùng pgbench cho **50 client đồng thời** mỗi client mua 1 chiếc. Kết quả: đúng **5 đơn thành công**, 45 giao dịch nhận lỗi OUT_OF_STOCK, stock cuối cùng = 0, không có giao dịch nào làm kho âm. Huỷ đơn (`cancel_order()`) cũng là một giao dịch: trả kho, ghi nhật ký, đổi trạng thái – nếu bất kỳ bước nào lỗi thì không bước nào có hiệu lực.'),

    // ---------------------------------------------------------------- 3.6 matview + notify
    H2('3.6. Materialized view và LISTEN/NOTIFY cho dashboard quản trị'),
    H3('3.6.1. Bài toán'),
    RP('Dashboard cần doanh thu theo ngày trong 30 ngày, top sản phẩm bán chạy, doanh thu theo danh mục theo tháng. Mỗi lần mở trang mà JOIN và GROUP BY hàng chục nghìn `order_items` là lãng phí vì số liệu lịch sử không đổi. Ngoài ra người quản lý muốn được báo **ngay** khi một mã sắp hết hàng hoặc có đơn mới, không phải bấm tải lại trang; cách thông thường là polling định kỳ hoặc thêm Redis/RabbitMQ.'),
    H3('3.6.2. Giải pháp PostgreSQL'),
    RP('**Materialized view** lưu kết quả truy vấn thành bảng vật lý, có thể đánh index và chỉ tính lại khi gọi REFRESH. Với `REFRESH MATERIALIZED VIEW CONCURRENTLY` (yêu cầu một UNIQUE INDEX), việc làm mới không chặn người đang đọc. Nhóm tạo 3 materialized view và một hàm `refresh_sales_reports()`; trang quản trị có nút “Refresh báo cáo”, khi triển khai thật có thể gọi theo lịch (pg_cron hoặc cron hệ điều hành). Số liệu “hôm nay” vẫn tính trực tiếp vì chỉ chạm partition tháng hiện tại.'),
    ...code(`-- 006_reports_matview.sql
CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT date_trunc('day', o.created_at)::date AS day, count(*) AS orders,
       sum(o.total) AS revenue, sum(oi.qty) AS items_sold
FROM orders o JOIN order_items oi ON oi.order_id = o.id AND oi.order_created_at = o.created_at
WHERE o.status <> 'cancelled' GROUP BY 1 WITH DATA;
CREATE UNIQUE INDEX ON mv_sales_daily (day);     -- cần cho REFRESH ... CONCURRENTLY

CREATE OR REPLACE FUNCTION refresh_sales_reports() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_products;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_by_category_month;
END $$;`),
    RP('**LISTEN/NOTIFY** là cơ chế pub/sub tích hợp sẵn: một phiên gọi `LISTEN kênh`, phiên khác (hoặc trigger) gọi `pg_notify(kênh, payload)` và mọi phiên đang lắng nghe nhận được thông điệp ngay khi giao dịch commit. Nhóm viết trigger trên `products` bắn kênh `low_stock` khi stock giảm xuống dưới 3 và trigger trên `orders` bắn kênh `new_order`. Backend giữ một kết nối riêng để LISTEN và chuyển tiếp xuống trình duyệt quản trị bằng Server-Sent Events.'),
    ...code(`-- 005_order_transaction.sql
CREATE OR REPLACE FUNCTION notify_low_stock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock < 3 AND NEW.stock < OLD.stock THEN
    PERFORM pg_notify('low_stock', json_build_object(
      'product_id', NEW.id, 'sku', NEW.sku, 'name', NEW.name, 'stock', NEW.stock, 'at', now())::text);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_products_low_stock AFTER UPDATE OF stock ON products
FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

// api/src/routes/events.js
await client.query('LISTEN low_stock'); await client.query('LISTEN new_order');
client.on('notification', (msg) => {
  for (const res of subscribers) res.write(\`event: \${msg.channel}\\ndata: \${msg.payload}\\n\\n\`);
});`),
    H3('3.6.3. Kết quả'),
    RP('Đọc doanh thu 30 ngày từ materialized view mất **0,012 ms** so với **1,8 ms** khi tính trực tiếp trên bảng orders (nhanh hơn ~150 lần, và không đổi khi số đơn tăng). REFRESH CONCURRENTLY cả 3 view với 37.500 dòng chi tiết đơn mất khoảng 290 ms. Khi tồn kho một sản phẩm giảm xuống 1, trình duyệt quản trị nhận thông báo trong dưới 100 ms mà không cần tải lại (Hình 3.7); khi khách đặt đơn mới, số liệu “hôm nay” trên dashboard tự cập nhật.'),
    ...figure('13-admin-notify-sse.jpg', 3, 'Thông báo “Sắp hết hàng” đẩy từ PostgreSQL (pg_notify) sang trình duyệt quản trị', 9),

    // ---------------------------------------------------------------- 3.7 các index khác
    H2('3.7. Hệ thống chỉ mục và các loại index đặc biệt'),
    RP('Ngoài GIN, HNSW, BRIN đã trình bày, hệ thống dùng thêm bốn kỹ thuật index/cột mà PostgreSQL hỗ trợ tốt, mỗi index gắn với một truy vấn cụ thể của ứng dụng:'),
    ...table(
      [{ w: 3.2, h: 'Loại' }, { w: 5.2, h: 'Index trong hệ thống' }, { w: 7.6, h: 'Truy vấn phục vụ – lợi ích' }],
      [
        ['Partial index', '`idx_products_low_stock ON products (stock, id) WHERE stock < 3 AND status = \'active\'`', 'Dashboard “sắp hết hàng”. Chỉ index các dòng thoả điều kiện → 40 kB so với 168 kB của khoá chính; truy vấn 0,018 ms.'],
        ['Partial index', '`idx_orders_pending ON orders (created_at DESC) WHERE status IN (\'pending\',\'confirmed\')`', 'Danh sách đơn chờ xử lý; đơn đã hoàn tất không chiếm chỗ trong index.'],
        ['Covering index (INCLUDE)', '`idx_orders_customer_cover ON orders (customer_id, created_at DESC) INCLUDE (status, total)`', 'Lịch sử mua của khách: mọi cột cần lấy nằm trong index → *Index Only Scan*, không đọc bảng (Heap Fetches: 0).'],
        ['Expression index', '`idx_customers_email_lower ON customers (lower(email))`', 'Tìm khách theo email không phân biệt hoa thường mà vẫn dùng index.'],
        ['B-tree kết hợp + partial', '`idx_products_category_price ON products (category_id, price) WHERE status = \'active\'`', 'Trang danh mục sắp xếp theo giá.'],
        ['Generated column', '`orders.total`, `order_items.line_total`, `products.search_vec`', 'Dữ liệu dẫn xuất do CSDL tính, luôn nhất quán, có thể index.'],
      ], 3, 'Các index và cột sinh tự động khác trong hệ thống'),
    ...figure('11-admin-monitor-index.jpg', 3, 'Trang quản trị liệt kê bảng, index (loại, kích thước, lượt dùng) và partition', 15.5),
    pageBreak(),
  ];
}

module.exports = { chapter3 };
