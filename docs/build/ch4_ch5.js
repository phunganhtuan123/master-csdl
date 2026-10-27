const H = require('./helpers');
const { P, RP, H1, H2, H3, bullets, numbered, code, figure, table, pageBreak } = H;

function chapter4() {
  return [
    H1('Chương 4: Xây dựng ứng dụng'),
    H2('4.1. Kiến trúc tổng thể'),
    RP('Hệ thống theo mô hình ba tầng: trình duyệt ↔ API ↔ CSDL, đóng gói thành 3 container Docker (db, api, web). Logic nghiệp vụ quan trọng nhất (đặt hàng, huỷ đơn, thông báo) nằm trong CSDL dưới dạng hàm và trigger; API chủ yếu nhận yêu cầu, gọi SQL và trả JSON.'),
    ...figure('architecture.jpg', 4, 'Kiến trúc triển khai của hệ thống'),
    ...table(
      [{ w: 3.5, h: 'Thành phần' }, { w: 5, h: 'Công nghệ' }, { w: 7.5, h: 'Lý do chọn' }],
      [
        ['CSDL', 'PostgreSQL 16 (image pgvector/pgvector:pg16)', 'Có sẵn extension vector; bật pg_stat_statements qua tham số khởi động'],
        ['Backend', 'Node.js 22, Fastify 5, thư viện pg', 'Nhẹ, nhanh; `pg` cho phép viết SQL thuần với tham số $1, $2 – đúng yêu cầu không dùng ORM'],
        ['Frontend', 'Next.js 15 (App Router), React 19', 'SSR giúp trang sản phẩm tải nhanh, một dự án cho cả trang khách và trang quản trị'],
        ['Xác thực', 'JWT + bcrypt', 'Đơn giản, không cần phiên trên server'],
        ['Giám sát & đo', 'pg_stat_statements, pg_stat_user_*; trang Monitor trong admin; bench.js; pgbench', 'Mọi số liệu lấy thẳng từ view thống kê của PostgreSQL, không cần công cụ ngoài'],
        ['Triển khai', 'Docker Compose', 'Một lệnh dựng toàn bộ; chạy được trên máy cá nhân hoặc VM cloud'],
      ], 4, 'Công nghệ sử dụng'),
    H2('4.2. Backend: SQL thuần với Node.js'),
    H3('4.2.1. Lớp truy cập dữ liệu'),
    RP('Toàn bộ truy cập CSDL đi qua module `db.js` với ba hàm: `query(sql, params)` trả về mảng dòng, `one()` trả về một dòng, `tx(fn)` chạy nhiều câu trong một giao dịch (BEGIN/COMMIT/ROLLBACK). Tham số luôn được truyền qua `$1, $2` nên không có nguy cơ SQL injection. Kiểu NUMERIC và BIGINT được chuyển về Number để frontend dùng trực tiếp.'),
    ...code(`// api/src/db.js
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
export async function query(text, params = []) { const res = await pool.query(text, params); return res.rows; }
export async function one(text, params = [])   { return (await query(text, params))[0] ?? null; }
export async function tx(fn) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const r = await fn(client); await client.query('COMMIT'); return r; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}`),
    H3('4.2.2. Trình chạy migration'),
    RP('Thay vì dùng thư viện, nhóm tự viết `migrate.js` khoảng 60 dòng để dễ giải thích: đọc thư mục `db/migrations`, so với bảng `schema_migrations`, chạy từng file chưa áp dụng trong một giao dịch rồi ghi lại tên file. Lệnh `npm run migrate -- --reset` xoá schema và chạy lại từ đầu khi phát triển; `npm run reset` = migrate + seed + embed.'),
    ...code(`for (const file of files) {
  if (applied.has(file)) continue;
  await client.query('BEGIN');
  try {
    await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
}`),
    H3('4.2.3. Các nhóm API'),
    ...table(
      [{ w: 1.8, h: 'Method' }, { w: 6, h: 'Đường dẫn' }, { w: 8.2, h: 'Chức năng – tính năng CSDL sử dụng' }],
      [
        ['GET', '/api/categories', 'Danh mục kèm số sản phẩm (count FILTER)'],
        ['GET', '/api/products?category&metal&stone&min&max&sort&page', 'Danh sách, lọc JSONB `@>`, phân trang với `count(*) OVER()`'],
        ['GET', '/api/products/filters', 'Giá trị bộ lọc lấy từ JSONB'],
        ['GET', '/api/products/:slug', 'Chi tiết + ảnh phụ (json_agg)'],
        ['GET', '/api/products/:slug/similar', 'pgvector `<=>` + HNSW'],
        ['GET', '/api/search?q · /api/search/suggest?q', 'Full-text → trigram; gợi ý prefix'],
        ['POST', '/api/orders', '`place_order()` – transaction + FOR UPDATE'],
        ['GET', '/api/orders/:id?phone', 'Khách tra cứu đơn'],
        ['POST', '/api/admin/login', 'JWT 12 giờ'],
        ['GET', '/api/admin/dashboard', 'Materialized view + partial index + partition tháng hiện tại'],
        ['POST', '/api/admin/reports/refresh', 'REFRESH MATERIALIZED VIEW CONCURRENTLY'],
        ['GET/POST/PUT', '/api/admin/products…', 'CRUD, tính embedding; POST /:id/stock nhập kho trong transaction'],
        ['GET/PATCH', '/api/admin/orders… /status', 'Lọc theo khoảng ngày (pruning); huỷ qua `cancel_order()`'],
        ['GET', '/api/admin/events?token', 'SSE từ LISTEN/NOTIFY'],
        ['GET', '/api/admin/monitor/overview · statements · explain/:key', 'pg_stat_user_tables/indexes, pg_stat_statements, EXPLAIN ANALYZE'],
      ], 4, 'Danh sách API'),
    H2('4.3. Frontend Next.js'),
    RP('Ứng dụng web gồm hai khu vực trong cùng một dự án Next.js. Trang khách hàng dùng Server Components để gọi API và kết xuất HTML phía máy chủ (tải nhanh, thân thiện SEO); giỏ hàng lưu trong localStorage vì chưa cần ghi vào CSDL trước khi đặt. Trang quản trị là Client Components, giữ JWT trong localStorage, mở một kết nối EventSource để nhận thông báo từ PostgreSQL.'),
    ...table(
      [{ w: 5, h: 'Đường dẫn' }, { w: 11, h: 'Màn hình' }],
      [
        ['/', 'Trang chủ: danh mục, sản phẩm nổi bật, thanh tìm kiếm có gợi ý'],
        ['/san-pham', 'Danh sách với bộ lọc danh mục / chất liệu / đá / giá, sắp xếp, phân trang'],
        ['/san-pham/[slug]', 'Chi tiết, bảng thông số JSONB, thêm vào giỏ, 8 sản phẩm tương tự'],
        ['/tim-kiem?q=', 'Kết quả tìm kiếm, hiển thị chế độ full-text hay trigram'],
        ['/gio-hang', 'Giỏ hàng và biểu mẫu đặt hàng'],
        ['/tra-cuu · /don-hang/[id]', 'Tra cứu đơn bằng mã + số điện thoại'],
        ['/admin/login', 'Đăng nhập quản trị'],
        ['/admin', 'Dashboard: số liệu hôm nay, biểu đồ 30 ngày, doanh thu theo danh mục, top sản phẩm, sắp hết hàng'],
        ['/admin/san-pham · /admin/san-pham/[id]', 'Danh sách, thêm/sửa sản phẩm, chỉnh thuộc tính JSONB, nhập kho, nhật ký kho'],
        ['/admin/don-hang · /admin/don-hang/[id]', 'Danh sách lọc theo trạng thái/ngày, chi tiết và chuyển trạng thái / huỷ'],
        ['/admin/monitor', 'Benchmark EXPLAIN có/không index; bảng – index – partition; pg_stat_statements'],
      ], 4, 'Các màn hình của ứng dụng'),
    H2('4.4. Giao diện khách hàng'),
    ...figure('01-trang-chu.jpg', 4, 'Trang chủ', 14),
    ...figure('02-danh-sach-loc-jsonb.jpg', 4, 'Danh sách sản phẩm lọc theo danh mục Nhẫn và chất liệu Vàng 18K (JSONB)', 14),
    ...figure('06-gio-hang-dat-hang.jpg', 4, 'Giỏ hàng và biểu mẫu đặt hàng'),
    H2('4.5. Giao diện quản trị'),
    ...figure('07-admin-dashboard.jpg', 4, 'Dashboard quản trị (dữ liệu từ materialized view)', 14),
    ...figure('08-admin-don-hang.jpg', 4, 'Danh sách đơn hàng với bộ lọc trạng thái và khoảng ngày'),
    ...figure('09-admin-san-pham-jsonb.jpg', 4, 'Màn hình sửa sản phẩm – thêm/xoá thuộc tính JSONB và nhập kho', 14),
    H2('4.6. Triển khai bằng Docker Compose'),
    RP('File `docker-compose.yml` khai báo 3 dịch vụ. Dịch vụ `db` dùng image chính thức của pgvector (PostgreSQL 16 kèm extension vector) với tham số `shared_preload_libraries=pg_stat_statements`; `api` chờ `db` sẵn sàng (healthcheck), chạy migrate → seed → embed rồi mới khởi động; `web` build Next.js ở chế độ standalone. Toàn bộ hệ thống khởi động bằng một lệnh:'),
    ...code(`docker compose up -d --build
# Web:     http://localhost:3000   (admin: /admin, tài khoản admin / admin123)
# API:     http://localhost:4000/api/health
# Monitor: http://localhost:3000/admin/monitor`),
    RP('Khi triển khai lên máy chủ thật chỉ cần đổi mật khẩu CSDL, `JWT_SECRET`, `ADMIN_PASSWORD` và gắn volume `pgdata` vào ổ đĩa bền.'),
    pageBreak(),
  ];
}

function chapter5() {
  return [
    H1('Chương 5: Kiểm thử, benchmark và giám sát'),
    H2('5.1. Dữ liệu thử nghiệm: 1 triệu đơn hàng'),
    RP('Dữ liệu mẫu ban đầu (30.000 đơn) đủ để chạy ứng dụng nhưng quá nhỏ để thấy giá trị của partition và index – mọi bảng đều nằm gọn trong bộ nhớ đệm. Vì vậy nhóm viết thêm script `api/src/seed-big.js` (`npm run seed:big`) sinh **1.035.853 đơn hàng** và **1.543.358 dòng chi tiết** rải đều từ 01/2024 đến 10/2026, tự tạo partition cho từng tháng bằng hàm `ensure_orders_partition()`. Script chèn theo từng tháng bằng `generate_series` ngay trong CSDL (không đi qua ứng dụng) nên mất khoảng 100 giây; số lượng có thể đổi qua biến môi trường `BIG_ORDERS`.'),
    ...table(
      [{ w: 5, h: 'Chỉ số' }, { w: 11, h: 'Giá trị' }],
      [
        ['PostgreSQL', '16.15, container Linux 2 vCPU, cấu hình mặc định (shared_buffers 128 MB, work_mem 4 MB)'],
        ['Sản phẩm', '3.033 (40 viết tay + 2.993 sinh tự động), mỗi sản phẩm có JSONB, tsvector và vector 256 chiều'],
        ['Đơn hàng', '1.035.853 dòng, 37 partition theo tháng, 312 MB (kể cả index)'],
        ['Chi tiết đơn', '1.543.358 dòng, 241 MB'],
        ['Khách hàng', '1.006'],
        ['Dung lượng CSDL', '602 MB'],
      ], 5, 'Môi trường và dữ liệu thử nghiệm'),
    H2('5.2. Công cụ đo: bench.js'),
    RP('Để kết quả lặp lại được và không phụ thuộc thao tác tay, nhóm viết công cụ đo `api/src/bench.js` (`npm run bench`). Công cụ này:'),
    ...bullets([
      'Chạy `VACUUM ANALYZE` rồi lần lượt 12 kịch bản, mỗi kịch bản **5 lần** bằng `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` và lấy **trung vị** để loại nhiễu.',
      'Mỗi kịch bản chạy hai cấu hình: (A) bình thường – planner tự chọn index; (B) tắt loại scan tương ứng bằng `SET LOCAL enable_… = off` trong một transaction rồi ROLLBACK, hoặc so với câu truy vấn tương đương không dùng cấu trúc đặc biệt (materialized view).',
      'Đọc kế hoạch JSON để ghi lại loại scan, tên index, số partition thật sự bị quét, Heap Fetches và số buffer.',
      'Đo kích thước index: tạo tạm B-tree trên `orders(created_at)` để so với BRIN rồi xoá; partial, covering, khoá chính.',
      'Xuất `docs/benchmark/bench-report.md` (bảng Markdown) và `bench-report.json` (để vẽ biểu đồ), đồng thời in bảng ra màn hình.',
    ]),
    ...code(`$ cd api && npm run bench
Benchmark PostgreSQL — 5 lần/kịch bản, lấy trung vị
PostgreSQL 16.15 · 1,035,853 đơn / 37 partition / 312 MB · 1,543,358 chi tiết · shared_buffers 128MB

Kịch bản                                     Có index   Không index  Nhanh hơn  Scan (có index)
JSONB @> với GIN (jsonb_path_ops)            0.062 ms   2.136 ms     34.5×      Bitmap Index Scan
Doanh thu 2 tuần: partition pruning + BRIN   3.276 ms   66.405 ms    20.3×      Seq Scan [1/37 partition]
Lịch sử mua của khách: covering (INCLUDE)    0.207 ms   51.885 ms    250.7×     Index Only Scan
Đơn chờ xử lý mới nhất: partial index        0.202 ms   97.83 ms     484.3×     Index Scan
Doanh thu 30 ngày: matview vs tính trực tiếp 0.018 ms   19.388 ms    1077×      Index Scan trên matview
...
Kích thước index: BRIN created_at 888 kB vs B-tree 23 MB (nhỏ hơn 26.3×)`),
    H2('5.3. Kết quả: có và không có index trên 1 triệu đơn hàng'),
    ...table(
      [{ w: 5.4, h: 'Kịch bản' }, { w: 2.3, h: 'Có index (ms)', align: 'center' }, { w: 2.5, h: 'Không index (ms)', align: 'center' }, { w: 2, h: 'Nhanh hơn', align: 'center' }, { w: 3.8, h: 'Scan khi có index' }],
      [
        ['Lọc JSONB `@>` 2 thuộc tính', '0,062', '2,136', '34×', 'Bitmap Index Scan (GIN)'],
        ['Full-text search 3 từ', '0,065', '0,622', '9,6×', 'Bitmap Index Scan (GIN)'],
        ['Trigram gõ sai chính tả', '6,35', '16,3', '2,6×', 'Bitmap Index Scan (GIN trgm)'],
        ['pgvector 8 láng giềng', '0,232', '1,72', '7,4×', 'Index Scan (HNSW)'],
        ['Doanh thu 2 tuần (pruning)', '3,28', '66,4', '20×', 'Seq Scan 1/37 partition'],
        ['Doanh thu 1 tháng theo trạng thái', '10,5', '62,4', '6×', 'Seq Scan 1/37 partition'],
        ['Ép dùng BRIN lọc 3 ngày trong 1 partition', '2,74', '1,93', '0,7×', 'Bitmap Index Scan (BRIN)'],
        ['Lịch sử mua của khách (covering)', '0,207', '51,9', '250×', 'Index Only Scan, Heap Fetches 0'],
        ['Đơn chờ xử lý mới nhất (partial)', '0,202', '97,8', '484×', 'Index Scan (partial)'],
        ['Sắp hết hàng (partial)', '0,020', '1,71', '86×', 'Bitmap Index Scan (partial)'],
        ['Doanh thu 30 ngày (matview)', '0,018', '19,4', '1.077×', 'Index Scan trên matview'],
        ['Top 10 bán chạy (matview)', '0,020', '1.142', '57.000×', 'Seq Scan trên matview'],
      ], 5, 'Thời gian thực thi có và không có index (trung vị 5 lần, 1.035.853 đơn hàng)'),
    ...table(
      [{ w: 6, h: 'Index' }, { w: 3, h: 'Kích thước', align: 'center' }, { w: 7, h: 'Ghi chú' }],
      [
        ['BRIN trên orders(created_at)', '888 kB', 'Tổng 37 partition'],
        ['B-tree trên orders(created_at)', '23 MB', 'Tạo tạm để so sánh – BRIN nhỏ hơn 26 lần'],
        ['Partial idx_orders_pending', '17 MB', 'Chỉ chứa đơn pending/confirmed (~25 % số đơn)'],
        ['Covering idx_orders_customer_cover', '65 MB', 'INCLUDE (id, status, total) – đổi dung lượng lấy Index Only Scan'],
        ['Partial idx_products_low_stock', '40 kB', 'So với khoá chính products 168 kB'],
      ], 5, 'Kích thước các index trên bảng orders và products'),
    RP('**Nhận xét.** (1) Lợi ích của index tăng theo kích thước dữ liệu: cùng truy vấn đơn chờ xử lý, trên 30.000 đơn index nhanh hơn ~16 lần, trên 1 triệu đơn nhanh hơn ~480 lần, vì quét tuần tự tăng tuyến tính còn index gần như không đổi. (2) Partition pruning là nguồn tăng tốc chính cho các báo cáo theo thời gian; khi đã partition theo tháng thì mỗi partition đủ nhỏ để BRIN không nhanh hơn quét tuần tự – giá trị của BRIN lúc này là kích thước (888 kB so với 23 MB) và nó vẫn hữu ích khi partition lớn hơn RAM. (3) Materialized view biến truy vấn hơn 1 giây thành micro-giây, đổi lại số liệu trễ đến lần REFRESH gần nhất – phù hợp cho báo cáo lịch sử, không dùng cho tồn kho. (4) Covering index tốn thêm 65 MB nhưng cho Index Only Scan (Heap Fetches = 0); với bảng lớn hơn RAM đây là khác biệt giữa đọc đĩa và không đọc đĩa.'),
    ...figure('12-admin-pg-stat-statements.jpg', 5, 'Thống kê câu SQL từ pg_stat_statements trên trang quản trị'),
    H2('5.4. Kiểm chứng chống bán quá tồn kho'),
    RP('Dùng pgbench với kịch bản `oversell_test.sql`: đặt tồn kho của sản phẩm id = 2 bằng 5, khởi chạy 50 client đồng thời, mỗi client gọi `place_order()` mua 1 chiếc.'),
    ...code(`$ bash db/benchmark/run_bench.sh oversell
number of clients: 50
number of transactions actually processed: 5/50     ← chỉ 5 giao dịch thành công
 id |                   name                   | stock
----+------------------------------------------+-------
  2 | Nhẫn kim cương vàng 18K Solitaire 6 chấu |     0`),
    RP('Kết quả đúng như kỳ vọng: 5 đơn được tạo, 45 giao dịch còn lại bị từ chối với lỗi OUT_OF_STOCK, tồn kho về 0 và không bao giờ âm. Nếu bỏ `FOR UPDATE` và kiểm tra tồn kho ở tầng ứng dụng, số đơn thành công vượt quá 5 – minh hoạ vì sao phải để CSDL kiểm soát đồng thời.'),
    H2('5.5. Thông lượng với pgbench'),
    ...table(
      [{ w: 6, h: 'Kịch bản (trên CSDL 1 triệu đơn)' }, { w: 2, h: 'Client', align: 'center' }, { w: 2, h: 'Thời gian', align: 'center' }, { w: 3, h: 'Giao dịch/giây', align: 'center' }, { w: 3, h: 'Độ trễ TB', align: 'center' }],
      [
        ['Đặt hàng đồng thời (`place_order`, mỗi đơn 1 sản phẩm ngẫu nhiên)', '30', '10 s', '≈ 1.090', '28 ms'],
        ['Tải đọc: full-text + lọc JSONB + gợi ý vector (3 câu/giao dịch)', '20', '10 s', '≈ 850', '24 ms'],
      ], 5, 'Kết quả pgbench (máy ảo 2 vCPU, cấu hình PostgreSQL mặc định)'),
    RP('Khoảng một nghìn đơn mỗi giây trên CSDL đã có 1 triệu đơn là dư thừa so với nhu cầu của một cửa hàng trang sức, cho thấy một PostgreSQL đơn lẻ với index phù hợp đủ phục vụ mà không cần cache hay hệ thống tìm kiếm riêng.'),
    H2('5.6. Giám sát'),
    RP('**pg_stat_statements** ghi nhận mọi câu SQL đã chuẩn hoá: số lần gọi, tổng/trung bình thời gian, số dòng, tỉ lệ cache hit. Trang quản trị hiển thị top 25 câu theo tổng thời gian hoặc số lần gọi và có nút reset – câu nào trung bình chậm là ứng viên để thêm index. **pg_stat_user_tables / pg_stat_user_indexes / pg_inherits** cho biết số dòng, dung lượng, số lần quét tuần tự hay quét index của từng bảng, lượt dùng của từng index (index có `idx_scan = 0` lâu ngày nên xoá) và danh sách partition (Hình 3.8). Toàn bộ số liệu giám sát được lấy trực tiếp từ các view thống kê của PostgreSQL qua trang **Monitor & Benchmark** trong giao diện quản trị (ba thẻ: Benchmark EXPLAIN có/không index, Bảng – Index – Partition, pg_stat_statements), nên không cần cài thêm công cụ giám sát bên ngoài.'),
    pageBreak(),
  ];
}

function conclusion() {
  return [
    H1('Kết luận'),
    H2('1. Kết quả đạt được'),
    RP('Tiểu luận đã xây dựng hoàn chỉnh một hệ thống bán hàng trang sức trên PostgreSQL 16 gồm lược đồ 8 bảng với đầy đủ ràng buộc, 6 file migration bằng SQL thuần, backend Node.js/Fastify không dùng ORM, frontend Next.js cho khách hàng và quản trị viên, đóng gói Docker Compose. Quan trọng hơn, mỗi tính năng nổi bật của PostgreSQL được gắn với một bài toán nghiệp vụ thật và được kiểm chứng bằng số liệu:'),
    ...bullets([
      '**JSONB + GIN** giải quyết thuộc tính khác nhau giữa các loại trang sức, lọc nhanh hơn quét tuần tự ~30 lần.',
      '**Full-text search tiếng Việt** với unaccent và pg_trgm cho phép tìm không dấu, gõ sai chính tả, gợi ý khi gõ – không cần Elasticsearch.',
      '**pgvector + HNSW** mang tính năng gợi ý sản phẩm tương tự theo hướng AI vào ngay CSDL.',
      '**Partitioning + BRIN** kiểm chứng trên 1 triệu đơn: pruning chỉ quét 1/37 partition (nhanh hơn 20 lần), BRIN nhỏ hơn B-tree 26 lần.',
      '**Transaction + SELECT FOR UPDATE** trong hàm PL/pgSQL bảo đảm không bán quá tồn kho, kiểm chứng với 50 client đồng thời.',
      '**Materialized view + LISTEN/NOTIFY** cho dashboard nhanh gấp hàng nghìn lần trên 1 triệu đơn và cảnh báo thời gian thực mà không cần Redis hay hàng đợi.',
    ]),
    RP('Qua đó nhóm rút ra nhận định: PostgreSQL không chỉ là một CSDL quan hệ mà là một nền tảng dữ liệu đa mô hình; với một hệ thống thương mại điện tử quy mô vừa, việc tận dụng đúng các tính năng của PostgreSQL có thể thay thế nhiều thành phần hạ tầng riêng lẻ, giảm chi phí vận hành và độ phức tạp.'),
    H2('2. Hạn chế'),
    ...bullets([
      'Embedding cho pgvector dùng kỹ thuật feature hashing nên chỉ phản ánh tương đồng về từ khoá/thuộc tính, chưa phải “hiểu” ngữ nghĩa hay hình ảnh như mô hình AI thật.',
      'Chưa có từ điển tiếng Việt cho full-text search (tách từ ghép, từ đồng nghĩa); hiện xử lý ở mức bỏ dấu và trigram.',
      'Mới đo đến 1 triệu đơn hàng trên một máy ảo 2 vCPU với cấu hình PostgreSQL mặc định; chưa tinh chỉnh tham số và chưa thử nghiệm replication/high availability.',
      'Nghiệp vụ còn đơn giản: chưa có thanh toán trực tuyến, khuyến mãi, nhiều kho.',
    ]),
    H2('3. Hướng phát triển'),
    ...bullets([
      'Thay hàm embedding bằng mô hình đa phương thức (CLIP) để gợi ý theo ảnh sản phẩm; thử IVFFlat và tinh chỉnh tham số HNSW (m, ef_construction).',
      'Bổ sung từ điển tiếng Việt cho tsvector, kết hợp xếp hạng theo lượt bán.',
      'Tự động tạo partition và làm mới materialized view bằng pg_cron; lưu trữ partition cũ sang bảng nén hoặc S3.',
      'Thêm Row-Level Security để phân quyền nhiều nhân viên, streaming replication cho đọc/ghi tách biệt.',
      'Mở rộng nghiệp vụ: thanh toán, voucher, khách hàng thân thiết, nhiều chi nhánh với PostGIS.',
    ]),
    pageBreak(),
    H1('Tài liệu tham khảo'),
    ...numbered([
      'DB-Engines, “DB-Engines Ranking – Trend of PostgreSQL popularity”, https://db-engines.com/en/ranking, truy cập tháng 10/2026.',
      'Redgate Software, “DB-Engines: PostgreSQL leads H1 2026 database growth as data platforms gain momentum”, thông cáo báo chí 10/06/2026.',
      'PostgreSQL Global Development Group, *PostgreSQL 16 Documentation*, https://www.postgresql.org/docs/16/ – các chương: JSON Types, Full Text Search, Table Partitioning, Index Types, Materialized Views, Explicit Locking, NOTIFY.',
      'Stack Overflow, *Developer Survey 2024–2025*, mục Databases, https://survey.stackoverflow.co/.',
      'Andrew Kane, *pgvector – Open-source vector similarity search for Postgres*, https://github.com/pgvector/pgvector.',
      'PostgreSQL Global Development Group, *pg_trgm, unaccent, pg_stat_statements – Additional Supplied Modules*, https://www.postgresql.org/docs/16/contrib.html.',
      'Fastify, *Fastify Documentation*, https://fastify.dev/; node-postgres, https://node-postgres.com/.',
      'Vercel, *Next.js 15 Documentation*, https://nextjs.org/docs.',
      'Đỗ Phúc, *Giáo trình Cơ sở dữ liệu*, NXB Đại học Quốc gia TP.HCM (tài liệu môn học).',
    ], 'refs'),
    pageBreak(),
    H1('Phụ lục'),
    H2('Phụ lục A. Hướng dẫn cài đặt và chạy'),
    ...code(`# Cách 1: Docker (khuyến nghị)
git clone <repo> jewelry-shop-postgres && cd jewelry-shop-postgres
docker compose up -d --build

# Cách 2: chạy tay (cần PostgreSQL 16 + pgvector)
cd api && cp .env.example .env && npm install
npm run migrate && npm run seed && npm run embed && npm run dev      # API :4000
npm run seed:big   # (tuỳ chọn) sinh 1 triệu đơn hàng để test partition/index
npm run bench      # công cụ đo -> docs/benchmark/bench-report.md
cd ../web && npm install && npm run dev                              # Web :3000

# Benchmark
bash db/benchmark/run_bench.sh explain | order | search | oversell`),
    H2('Phụ lục B. Cấu trúc mã nguồn'),
    ...code(`jewelry-shop-postgres/
├── db/migrations/001_extensions.sql … 006_reports_matview.sql
├── db/seed/seed.sql
├── db/benchmark/{explain_before_after.sql, pgbench_*.sql, oversell_test.sql, run_bench.sh}
├── api/src/{server.js, db.js, migrate.js, seed.js, seed-big.js, embed.js, embedding.js, bench.js}
├── api/src/routes/{catalog.js, search.js, orders.js, admin.js, monitor.js, events.js}
├── web/app/(shop)/…        trang khách hàng
├── web/app/admin/…         trang quản trị
├── docker-compose.yml
└── README.md`),
    H2('Phụ lục C. Mã nguồn SQL đầy đủ'),
    RP('Toàn bộ 6 file migration (khoảng 400 dòng SQL có chú thích tiếng Việt) và file seed được đính kèm trong thư mục `db/` của mã nguồn nộp kèm tiểu luận.'),
  ];
}

module.exports = { chapter4, chapter5, conclusion };
