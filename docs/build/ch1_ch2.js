const H = require('./helpers');
const { P, RP, H1, H2, H3, bullets, numbered, code, figure, table, pageBreak } = H;

function chapter1() {
  return [
    H1('Chương 1: Tổng quan về PostgreSQL'),
    H2('1.1. Lịch sử và giấy phép'),
    RP('PostgreSQL bắt nguồn từ dự án POSTGRES của giáo sư Michael Stonebraker tại Đại học California, Berkeley (1986), kế thừa hệ Ingres. Năm 1996 dự án đổi tên thành PostgreSQL để nhấn mạnh việc hỗ trợ SQL và được phát triển bởi cộng đồng PostgreSQL Global Development Group cho đến nay. Phiên bản 16 phát hành tháng 9/2023, phiên bản 17 tháng 9/2024; mỗi năm có một phiên bản lớn và các bản vá định kỳ [3].'),
    RP('PostgreSQL phát hành theo giấy phép PostgreSQL License (tương tự BSD/MIT): được dùng, sửa, phân phối miễn phí kể cả trong sản phẩm thương mại, không có phiên bản “Enterprise” thu phí. Đây là lý do nhiều nền tảng cloud (Amazon RDS/Aurora, Google Cloud SQL/AlloyDB, Azure Database, Supabase, Neon…) chọn PostgreSQL làm lõi.'),
    H2('1.2. Vị trí trên thị trường'),
    RP('Theo bảng xếp hạng DB-Engines (tổng hợp từ mức độ thảo luận, tìm kiếm, tuyển dụng, tài liệu…), PostgreSQL ổn định ở vị trí thứ 4 sau Oracle, MySQL và Microsoft SQL Server, nhưng là hệ CSDL duy nhất trong top 4 liên tục **tăng điểm** trong khi ba hệ còn lại giảm. PostgreSQL từng được DB-Engines bình chọn là “DBMS of the Year” các năm 2017, 2018, 2020 và 2023; trong nửa đầu năm 2026 PostgreSQL tiếp tục dẫn đầu về mức tăng điểm (+21,97 điểm) [1][2]. Khảo sát Stack Overflow Developer Survey các năm gần đây cũng xếp PostgreSQL là CSDL được lập trình viên sử dụng và yêu thích nhiều nhất [4].'),
    ...table(
      [{ w: 1.2, h: 'Hạng' }, { w: 5, h: 'Hệ quản trị CSDL' }, { w: 3, h: 'Mô hình' }, { w: 3, h: 'Giấy phép' }, { w: 4, h: 'Xu hướng điểm' }],
      [
        ['1', 'Oracle', 'Quan hệ, đa mô hình', 'Thương mại', 'Giảm nhẹ'],
        ['2', 'MySQL', 'Quan hệ', 'GPL / thương mại', 'Giảm'],
        ['3', 'Microsoft SQL Server', 'Quan hệ', 'Thương mại', 'Giảm'],
        ['4', 'PostgreSQL', 'Quan hệ, đa mô hình', 'Mã nguồn mở (PostgreSQL License)', 'Tăng'],
        ['5', 'MongoDB', 'Tài liệu (NoSQL)', 'SSPL', 'Tăng nhẹ'],
      ], 1, 'Top 5 hệ quản trị CSDL theo DB-Engines (2026) [1]'),
    H2('1.3. Kiến trúc tổng quát'),
    RP('PostgreSQL dùng mô hình **tiến trình (process-per-connection)**: tiến trình chính `postmaster` lắng nghe kết nối và sinh ra một tiến trình `backend` cho mỗi phiên làm việc; các tiến trình nền khác đảm nhiệm ghi WAL, checkpoint, autovacuum, thống kê. Dữ liệu được đệm trong vùng nhớ dùng chung `shared_buffers`.'),
    RP('Ba cơ chế nền tảng tạo nên độ tin cậy của PostgreSQL:'),
    ...bullets([
      '**MVCC (Multi-Version Concurrency Control):** mỗi lần cập nhật tạo một phiên bản mới của dòng dữ liệu thay vì ghi đè; người đọc không chặn người ghi và ngược lại. Phiên bản cũ được dọn bởi VACUUM.',
      '**WAL (Write-Ahead Log):** mọi thay đổi được ghi vào nhật ký trước khi ghi vào file dữ liệu, bảo đảm tính bền vững (Durability) và là nền của sao lưu điểm thời gian, streaming replication.',
      '**Giao dịch ACID đầy đủ** với 4 mức cô lập, trong đó DDL (CREATE/ALTER) cũng nằm trong giao dịch – tính chất rất hữu ích cho migration.',
    ]),
    H2('1.4. Hệ sinh thái tính năng và extension'),
    RP('Khác với các HQTCSDL “chỉ quan hệ”, PostgreSQL được gọi là hệ CSDL **đa mô hình**: ngoài bảng và SQL chuẩn, nó hỗ trợ sẵn kiểu dữ liệu JSONB, mảng, kiểu khoảng (range), kiểu hình học, tìm kiếm toàn văn, nhiều phương pháp index (B-tree, Hash, GIN, GiST, SP-GiST, BRIN), bảng phân vùng khai báo, materialized view, trigger, hàm lưu trữ bằng nhiều ngôn ngữ (PL/pgSQL, Python, JavaScript…) và cơ chế thông báo LISTEN/NOTIFY. Cơ chế **extension** cho phép bổ sung kiểu dữ liệu, toán tử và loại index mới mà không sửa lõi; những extension tiêu biểu là PostGIS (không gian địa lý), pgvector (vector cho AI), pg_trgm (tìm kiếm gần đúng), TimescaleDB (chuỗi thời gian), Citus (phân tán).'),
    ...table(
      [{ w: 4, h: 'Nhu cầu' }, { w: 4.5, h: 'PostgreSQL' }, { w: 4, h: 'MySQL' }, { w: 4, h: 'MongoDB' }],
      [
        ['Thuộc tính linh hoạt', 'JSONB + GIN index, toán tử @>, ->>', 'JSON (index phải tạo cột ảo)', 'Tài liệu BSON tự nhiên'],
        ['Tìm kiếm toàn văn', 'tsvector/tsquery, xếp hạng, nhiều ngôn ngữ, kết hợp pg_trgm', 'FULLTEXT index (hạn chế tiếng Việt)', 'Text index cơ bản / Atlas Search'],
        ['Vector cho AI', 'pgvector (HNSW, IVFFlat)', 'Chỉ từ MySQL 9 (HeatWave)', 'Atlas Vector Search (cloud)'],
        ['Phân vùng bảng', 'Khai báo RANGE/LIST/HASH, partition pruning', 'Có, nhưng hạn chế khoá ngoại', 'Sharding'],
        ['Giao dịch', 'ACID đầy đủ, DDL trong transaction', 'ACID (InnoDB), DDL không rollback', 'Giao dịch đa tài liệu từ 4.0'],
        ['Thông báo sự kiện', 'LISTEN/NOTIFY tích hợp', 'Không có', 'Change Streams'],
        ['Giấy phép', 'Mở hoàn toàn', 'GPL/thương mại (Oracle)', 'SSPL'],
      ], 1, 'So sánh PostgreSQL với MySQL và MongoDB ở các nhu cầu của đề tài'),
    H2('1.5. Lý do lựa chọn PostgreSQL cho hệ thống bán hàng trang sức'),
    RP('Từ phân tích trên, PostgreSQL phù hợp với đề tài vì: (1) vẫn là CSDL quan hệ nên bảo đảm tính toàn vẹn cho đơn hàng – tồn kho – thanh toán; (2) JSONB giải quyết thuộc tính khác nhau giữa các loại trang sức; (3) full-text search và pg_trgm xử lý tìm kiếm tiếng Việt ngay trong CSDL; (4) pgvector cho phép thêm tính năng gợi ý sản phẩm theo hướng AI mà không cần hệ thống riêng; (5) partitioning, BRIN, materialized view đáp ứng dữ liệu đơn hàng lớn dần; (6) LISTEN/NOTIFY thay thế hàng đợi thông báo. Tất cả nằm trong một hệ thống duy nhất, miễn phí, dễ vận hành bằng Docker.'),
    pageBreak(),
  ];
}

function chapter2() {
  return [
    H1('Chương 2: Phân tích nghiệp vụ và thiết kế cơ sở dữ liệu'),
    H2('2.1. Mô tả nghiệp vụ'),
    RP('Hệ thống phục vụ hai nhóm người dùng:'),
    ...bullets([
      '**Khách hàng** (không cần đăng nhập): xem danh mục, lọc sản phẩm theo chất liệu/loại đá/giá, tìm kiếm, xem chi tiết và sản phẩm tương tự, thêm vào giỏ, đặt hàng bằng họ tên – số điện thoại – địa chỉ, tra cứu đơn hàng.',
      '**Quản trị viên** (đăng nhập): xem dashboard doanh thu, top sản phẩm, cảnh báo sắp hết hàng theo thời gian thực; quản lý sản phẩm và thuộc tính; nhập kho; duyệt, chuyển trạng thái, huỷ đơn; theo dõi hiệu năng CSDL.',
    ]),
    RP('Quy trình đơn hàng: `pending` (khách vừa đặt) → `confirmed` (đã gọi xác nhận) → `shipping` → `completed`; có thể `cancelled` ở hai bước đầu, khi đó tồn kho được trả lại. Đơn từ 5 triệu đồng miễn phí vận chuyển, dưới 5 triệu phí 30.000 đ.'),
    ...table(
      [{ w: 1, h: 'STT' }, { w: 4.5, h: 'Chức năng' }, { w: 3, h: 'Tác nhân' }, { w: 7.5, h: 'Yêu cầu dữ liệu / ràng buộc' }],
      [
        ['1', 'Xem & lọc sản phẩm', 'Khách', 'Lọc theo danh mục, chất liệu, đá, giới tính, khoảng giá; phân trang; sắp xếp'],
        ['2', 'Tìm kiếm', 'Khách', 'Không dấu / có dấu đều khớp; chịu lỗi chính tả; gợi ý khi gõ'],
        ['3', 'Sản phẩm tương tự', 'Khách', 'Gợi ý 8 sản phẩm gần nhất về chất liệu, loại, đá'],
        ['4', 'Đặt hàng', 'Khách', 'Không bán quá tồn kho khi nhiều người đặt cùng lúc; lưu giá tại thời điểm mua'],
        ['5', 'Tra cứu đơn', 'Khách', 'Theo mã đơn + số điện thoại'],
        ['6', 'Dashboard', 'Admin', 'Doanh thu theo ngày/tháng/danh mục, top sản phẩm; phải nhanh dù đơn hàng lớn'],
        ['7', 'Cảnh báo hết hàng', 'Admin', 'Thông báo ngay khi tồn < 3 mà không cần tải lại trang'],
        ['8', 'Quản lý sản phẩm, kho', 'Admin', 'Thuộc tính thêm tuỳ ý; nhật ký xuất nhập kho'],
        ['9', 'Xử lý đơn', 'Admin', 'Chuyển trạng thái; huỷ phải trả kho trong cùng giao dịch'],
        ['10', 'Giám sát CSDL', 'Admin', 'Thống kê câu SQL, index, partition; chạy EXPLAIN so sánh'],
      ], 2, 'Danh sách chức năng và yêu cầu dữ liệu'),
    H2('2.2. Yêu cầu phi chức năng'),
    ...bullets([
      '**Toàn vẹn dữ liệu:** tồn kho không bao giờ âm; tổng tiền đơn hàng do CSDL tính; khoá ngoại đầy đủ.',
      '**Hiệu năng:** các truy vấn trang khách hàng dưới 10 ms với hơn 3.000 sản phẩm; báo cáo dashboard không phụ thuộc số lượng đơn.',
      '**Mở rộng:** thêm thuộc tính sản phẩm hoặc tháng mới không cần sửa lược đồ bằng tay.',
      '**Khả năng triển khai:** chạy được bằng một lệnh `docker compose up`.',
    ]),
    H2('2.3. Sơ đồ thực thể – quan hệ (ERD)'),
    RP('Lược đồ gồm 8 bảng, chia thành ba nhóm: danh mục – sản phẩm (categories, products, product_images), bán hàng (customers, orders, order_items), vận hành (stock_movements, admins). Các cột tô màu là nơi áp dụng tính năng đặc biệt của PostgreSQL.'),
    ...figure('erd.jpg', 2, 'Sơ đồ thực thể – quan hệ của hệ thống'),
    H2('2.4. Mô tả chi tiết các bảng'),
    H3('2.4.1. Bảng categories – danh mục'),
    ...table(
      [{ w: 3.2, h: 'Cột' }, { w: 3, h: 'Kiểu' }, { w: 2.3, h: 'Ràng buộc' }, { w: 7.5, h: 'Mô tả' }],
      [
        ['id', 'SERIAL', 'PK', 'Mã danh mục'],
        ['slug', 'TEXT', 'UNIQUE, NOT NULL', 'Định danh trên URL (`nhan-cuoi`)'],
        ['name', 'TEXT', 'NOT NULL', 'Tên hiển thị'],
        ['parent_id', 'INT', 'FK → categories', 'Danh mục cha (Nhẫn → Nhẫn cưới), cho phép cây danh mục'],
        ['created_at', 'TIMESTAMPTZ', 'DEFAULT now()', 'Thời điểm tạo'],
      ], 2, 'Cấu trúc bảng categories'),
    H3('2.4.2. Bảng products – sản phẩm'),
    RP('Đây là bảng trung tâm, chứa ba cột đặc biệt: `attributes` (JSONB), `search_vec` (tsvector sinh tự động) và `embedding` (vector 256 chiều).'),
    ...table(
      [{ w: 3.2, h: 'Cột' }, { w: 3, h: 'Kiểu' }, { w: 2.3, h: 'Ràng buộc' }, { w: 7.5, h: 'Mô tả' }],
      [
        ['id', 'BIGSERIAL', 'PK', 'Mã sản phẩm nội bộ'],
        ['sku', 'TEXT', 'UNIQUE', 'Mã hàng hiển thị (`NK-001`)'],
        ['slug', 'TEXT', 'UNIQUE', 'Định danh trên URL'],
        ['name', 'TEXT', 'NOT NULL', 'Tên sản phẩm'],
        ['category_id', 'INT', 'FK → categories', 'Danh mục'],
        ['price', 'NUMERIC(14,0)', 'CHECK ≥ 0', 'Giá bán (VNĐ, không số lẻ)'],
        ['stock', 'INT', 'CHECK ≥ 0', 'Tồn kho; ràng buộc cuối cùng chống bán âm'],
        ['attributes', 'JSONB', 'DEFAULT {}', 'Thuộc tính linh hoạt: metal, stone, carat, ring_size, length_cm…'],
        ['description', 'TEXT', '', 'Mô tả'],
        ['image_url', 'TEXT', '', 'Ảnh đại diện'],
        ['status', 'TEXT', 'CHECK IN (active, hidden, discontinued)', 'Trạng thái bán'],
        ['embedding', 'VECTOR(256)', '', 'Vector đặc trưng cho gợi ý sản phẩm tương tự (pgvector)'],
        ['search_vec', 'TSVECTOR', 'GENERATED STORED', 'Tự tính từ name (trọng số A) + description (trọng số B), đã bỏ dấu'],
        ['created_at, updated_at', 'TIMESTAMPTZ', 'DEFAULT now()', 'updated_at cập nhật bằng trigger'],
      ], 2, 'Cấu trúc bảng products'),
    H3('2.4.3. Bảng customers – khách hàng'),
    ...table(
      [{ w: 3.2, h: 'Cột' }, { w: 3, h: 'Kiểu' }, { w: 2.3, h: 'Ràng buộc' }, { w: 7.5, h: 'Mô tả' }],
      [
        ['id', 'BIGSERIAL', 'PK', ''],
        ['full_name', 'TEXT', 'NOT NULL', 'Họ tên'],
        ['phone', 'TEXT', 'UNIQUE, NOT NULL', 'Số điện thoại – khoá nhận diện khách, dùng cho upsert khi đặt hàng'],
        ['email, address', 'TEXT', '', 'Email có expression index `lower(email)`'],
      ], 2, 'Cấu trúc bảng customers'),
    H3('2.4.4. Bảng orders – đơn hàng (phân vùng theo tháng)'),
    RP('Bảng `orders` được khai báo `PARTITION BY RANGE (created_at)`, mỗi tháng một partition con (`orders_2026_01` … `orders_2026_12`) và một partition mặc định. Khoá chính bắt buộc chứa cột phân vùng nên là `(id, created_at)`.'),
    ...table(
      [{ w: 3.2, h: 'Cột' }, { w: 3, h: 'Kiểu' }, { w: 2.3, h: 'Ràng buộc' }, { w: 7.5, h: 'Mô tả' }],
      [
        ['id', 'BIGSERIAL', 'PK (cùng created_at)', 'Mã đơn'],
        ['created_at', 'TIMESTAMPTZ', 'PK, khoá phân vùng', 'Thời điểm đặt'],
        ['customer_id', 'BIGINT', 'FK → customers', ''],
        ['status', 'TEXT', 'CHECK 5 giá trị', 'pending / confirmed / shipping / completed / cancelled'],
        ['subtotal', 'NUMERIC(14,0)', '', 'Tiền hàng'],
        ['shipping_fee', 'NUMERIC(14,0)', '', 'Phí vận chuyển'],
        ['total', 'NUMERIC(14,0)', 'GENERATED ALWAYS AS (subtotal + shipping_fee)', 'Tổng tiền do PostgreSQL tính, ứng dụng không thể ghi sai'],
        ['note', 'TEXT', '', 'Ghi chú của khách'],
      ], 2, 'Cấu trúc bảng orders'),
    H3('2.4.5. Bảng order_items – chi tiết đơn hàng'),
    ...table(
      [{ w: 3.2, h: 'Cột' }, { w: 3, h: 'Kiểu' }, { w: 2.3, h: 'Ràng buộc' }, { w: 7.5, h: 'Mô tả' }],
      [
        ['id', 'BIGSERIAL', 'PK', ''],
        ['order_id, order_created_at', 'BIGINT, TIMESTAMPTZ', 'FK → orders(id, created_at)', 'Khoá ngoại tới bảng phân vùng phải trỏ đủ hai cột'],
        ['product_id', 'BIGINT', 'FK → products', ''],
        ['qty', 'INT', 'CHECK > 0', 'Số lượng'],
        ['unit_price', 'NUMERIC(14,0)', '', 'Giá tại thời điểm mua (giá sản phẩm có thể đổi sau)'],
        ['line_total', 'NUMERIC(14,0)', 'GENERATED (qty × unit_price)', 'Thành tiền'],
      ], 2, 'Cấu trúc bảng order_items'),
    H3('2.4.6. Các bảng còn lại'),
    ...table(
      [{ w: 3.5, h: 'Bảng' }, { w: 12.5, h: 'Vai trò và các cột chính' }],
      [
        ['product_images', 'Ảnh phụ của sản phẩm: product_id (FK, ON DELETE CASCADE), url, sort_order.'],
        ['stock_movements', 'Nhật ký xuất/nhập kho để truy vết vì sao tồn kho thay đổi: product_id, delta (âm = bán, dương = nhập/huỷ đơn), reason (order/cancel/import/adjust), ref_id (mã đơn liên quan), created_at.'],
        ['admins', 'Tài khoản quản trị: username (UNIQUE), password_hash (bcrypt), full_name.'],
        ['schema_migrations', 'Bảng kỹ thuật ghi nhớ file migration nào đã chạy (filename, applied_at).'],
      ], 2, 'Các bảng phụ trợ'),
    H2('2.5. Ràng buộc toàn vẹn và trigger'),
    ...bullets([
      '**Khoá ngoại** đầy đủ giữa các bảng; `product_images` xoá theo sản phẩm (CASCADE), `order_items` xoá theo đơn.',
      '**CHECK:** `price ≥ 0`, `stock ≥ 0`, `qty > 0`, `status` thuộc tập giá trị cho phép.',
      '**UNIQUE:** slug, sku, phone, username.',
      '**Generated column:** `orders.total`, `order_items.line_total`, `products.search_vec` – dữ liệu dẫn xuất luôn đúng, không phụ thuộc ứng dụng.',
      '**Trigger:** `set_updated_at` (cập nhật updated_at), `notify_low_stock` (bắn NOTIFY khi stock < 3), `notify_new_order` (bắn NOTIFY khi có đơn mới).',
      '**Hàm nghiệp vụ:** `place_order()` và `cancel_order()` gói trọn logic đặt/huỷ đơn trong một giao dịch (trình bày ở chương 3).',
    ]),
    H2('2.6. Tổ chức migration'),
    RP('Lược đồ được viết bằng SQL thuần trong 6 file đánh số thứ tự; mỗi file tập trung vào một chủ đề để dễ trình bày và dễ bảo trì. Trình chạy migration (viết khoảng 60 dòng Node.js, mục 4.3) ghi nhớ file đã chạy trong bảng `schema_migrations` và chạy từng file trong một giao dịch – nhờ PostgreSQL hỗ trợ DDL trong transaction nên nếu một file lỗi giữa chừng thì toàn bộ thay đổi của file đó được huỷ.'),
    ...table(
      [{ w: 5, h: 'File' }, { w: 11, h: 'Nội dung' }],
      [
        ['001_extensions.sql', 'Bật pg_trgm, unaccent, vector, pg_stat_statements; hàm `vi_unaccent()` IMMUTABLE'],
        ['002_core_tables.sql', 'categories, products (JSONB, tsvector, vector), product_images, customers, admins, trigger updated_at'],
        ['003_orders_partitioned.sql', 'orders phân vùng theo tháng, hàm tạo partition, order_items, stock_movements'],
        ['004_indexes.sql', 'Toàn bộ index: B-tree, GIN (JSONB, tsvector, trigram), HNSW, BRIN, covering, partial, expression'],
        ['005_order_transaction.sql', 'Hàm place_order(), cancel_order(); trigger NOTIFY low_stock, new_order'],
        ['006_reports_matview.sql', 'Materialized view báo cáo, hàm refresh, các view tiện ích'],
      ], 2, 'Các file migration'),
    pageBreak(),
  ];
}

module.exports = { chapter1, chapter2 };
