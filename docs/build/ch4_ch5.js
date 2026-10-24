const H = require('./helpers');
const { P, RP, H1, H2, H3, bullets, numbered, code, figure, table, pageBreak } = H;

function chapter4() {
  return [
    H1('Chương 4: Xây dựng ứng dụng'),
    H2('4.1. Kiến trúc tổng thể'),
    RP('Hệ thống theo mô hình ba tầng: trình duyệt ↔ API ↔ CSDL, đóng gói thành 4 container Docker (db, api, web, grafana). Logic nghiệp vụ quan trọng nhất (đặt hàng, huỷ đơn, thông báo) nằm trong CSDL dưới dạng hàm và trigger; API chủ yếu nhận yêu cầu, gọi SQL và trả JSON.'),
    ...figure('architecture.jpg', 4, 'Kiến trúc triển khai của hệ thống'),
    ...table(
      [{ w: 3.5, h: 'Thành phần' }, { w: 5, h: 'Công nghệ' }, { w: 7.5, h: 'Lý do chọn' }],
      [
        ['CSDL', 'PostgreSQL 16 (image pgvector/pgvector:pg16)', 'Có sẵn extension vector; bật pg_stat_statements qua tham số khởi động'],
        ['Backend', 'Node.js 22, Fastify 5, thư viện pg', 'Nhẹ, nhanh; `pg` cho phép viết SQL thuần với tham số $1, $2 – đúng yêu cầu không dùng ORM'],
        ['Frontend', 'Next.js 15 (App Router), React 19', 'SSR giúp trang sản phẩm tải nhanh, một dự án cho cả trang khách và trang quản trị'],
        ['Xác thực', 'JWT + bcrypt', 'Đơn giản, không cần phiên trên server'],
        ['Giám sát', 'pg_stat_statements, Grafana 11 (PostgreSQL datasource), pgbench', 'Không cần Prometheus; Grafana truy vấn thẳng các view thống kê'],
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
    RP('File `docker-compose.yml` khai báo 4 dịch vụ. Dịch vụ `db` dùng image chính thức của pgvector (PostgreSQL 16 kèm extension vector) với tham số `shared_preload_libraries=pg_stat_statements`; `api` chờ `db` sẵn sàng (healthcheck), chạy migrate → seed → embed rồi mới khởi động; `web` build Next.js ở chế độ standalone; `grafana` tự nạp datasource và dashboard từ thư mục `monitoring`. Toàn bộ hệ thống khởi động bằng một lệnh:'),
    ...code(`docker compose up -d --build
# Web:     http://localhost:3000   (admin: /admin, tài khoản admin / admin123)
# API:     http://localhost:4000/api/health
# Grafana: http://localhost:3001   (admin / admin)`),
    RP('Khi triển khai lên máy chủ thật chỉ cần đổi mật khẩu CSDL, `JWT_SECRET`, `ADMIN_PASSWORD` và gắn volume `pgdata` vào ổ đĩa bền.'),
    pageBreak(),
  ];
}

function chapter5() {
  return [
    H1('Chương 5: Kiểm thử, benchmark và giám sát'),
    H2('5.1. Môi trường và dữ liệu thử nghiệm'),
    RP('Toàn bộ số liệu được đo trên PostgreSQL 16.15 chạy trong container Linux (cấu hình mặc định, `shared_buffers` 128 MB), dữ liệu mẫu do script `seed.sql` sinh ra: 7 danh mục, 3.033 sản phẩm (40 sản phẩm viết tay với thuộc tính đầy đủ + 3.000 sản phẩm sinh tự động), 500 khách hàng, khoảng 30.000 đơn hàng rải từ tháng 1 đến tháng 10/2026 với 37.500 dòng chi tiết. Trước khi đo đã chạy `VACUUM ANALYZE`. Mỗi truy vấn chạy 3 lần, lấy lần nhanh nhất (loại bỏ ảnh hưởng cache lạnh).'),
    H2('5.2. So sánh hiệu năng có và không có index (EXPLAIN ANALYZE)'),
    RP('Phương pháp: chạy cùng một câu SQL hai lần; lần hai đặt `SET LOCAL enable_<loại scan> = off` để buộc planner không dùng index. Với materialized view thì so với câu truy vấn tính trực tiếp. Script `db/benchmark/explain_before_after.sql` và trang Admin → Monitor & Benchmark đều cho ra kết quả này.'),
    ...table(
      [{ w: 5.2, h: 'Kịch bản' }, { w: 2.6, h: 'Có index (ms)', align: 'center' }, { w: 2.8, h: 'Không index (ms)', align: 'center' }, { w: 2.2, h: 'Nhanh hơn', align: 'center' }, { w: 3.2, h: 'Loại scan khi có index' }],
      [
        ['Lọc JSONB `@>` 2 thuộc tính', '0,056', '1,572', '28×', 'Bitmap Index Scan (GIN)'],
        ['Full-text search 3 từ', '0,078', '0,545', '7×', 'Bitmap Index Scan (GIN)'],
        ['Trigram gõ sai chính tả', '6,0', '15,3', '2,5×', 'Bitmap Index Scan (GIN trgm)'],
        ['pgvector 8 láng giềng', '0,254', '1,427', '5,6×', 'Index Scan (HNSW)'],
        ['Đơn theo khoảng ngày (pruning)', '0,286', '1,678', '5,9×', 'Seq Scan 1 partition'],
        ['Sắp hết hàng (partial index)', '0,018', '0,296', '16×', 'Index Scan (partial)'],
        ['Lịch sử mua của khách (covering)', '0,065', '0,058', '≈1×', 'Index Only Scan, Heap Fetches 0'],
        ['Doanh thu 30 ngày (matview)', '0,012', '1,798', '150×', 'Seq Scan trên matview'],
      ], 5, 'Thời gian thực thi có và không có index trên dữ liệu mẫu'),
    RP('Nhận xét: với tập dữ liệu còn nhỏ (vài nghìn sản phẩm, vài chục nghìn đơn) chênh lệch đã từ vài lần đến hàng trăm lần; khoảng cách này tăng theo kích thước dữ liệu vì quét tuần tự tăng tuyến tính còn index tăng theo log hoặc gần như không đổi (matview, BRIN). Covering index chưa thể hiện lợi thế vì bảng đang nằm trọn trong bộ nhớ đệm; lợi ích của Index Only Scan rõ nhất khi bảng lớn hơn RAM. Kích thước index cũng là một tiêu chí: BRIN trên `created_at` chiếm 312 kB so với 1.000 kB của B-tree; partial index sắp hết hàng chỉ 40 kB.'),
    ...figure('12-admin-pg-stat-statements.jpg', 5, 'Thống kê câu SQL từ pg_stat_statements trên trang quản trị'),
    H2('5.3. Kiểm chứng chống bán quá tồn kho'),
    RP('Dùng pgbench với kịch bản `oversell_test.sql`: đặt tồn kho của sản phẩm id = 2 bằng 5, khởi chạy 50 client đồng thời, mỗi client gọi `place_order()` mua 1 chiếc.'),
    ...code(`$ bash db/benchmark/run_bench.sh oversell
number of clients: 50
number of transactions actually processed: 5/50     ← chỉ 5 giao dịch thành công
 id |                   name                   | stock
----+------------------------------------------+-------
  2 | Nhẫn kim cương vàng 18K Solitaire 6 chấu |     0
 don_thanh_cong
----------------
              5`),
    RP('Kết quả đúng như kỳ vọng: 5 đơn được tạo, 45 giao dịch còn lại bị từ chối với lỗi OUT_OF_STOCK, tồn kho về 0 và không bao giờ âm. Khi chạy cùng kịch bản với phiên bản không có `FOR UPDATE` (kiểm tra tồn kho ở tầng ứng dụng), số đơn thành công vượt quá 5 – minh hoạ rõ vì sao phải để CSDL kiểm soát đồng thời.'),
    H2('5.4. Thông lượng với pgbench'),
    ...table(
      [{ w: 5, h: 'Kịch bản' }, { w: 2.5, h: 'Client', align: 'center' }, { w: 2.5, h: 'Thời gian', align: 'center' }, { w: 3, h: 'Giao dịch/giây', align: 'center' }, { w: 3, h: 'Độ trễ TB', align: 'center' }],
      [
        ['Đặt hàng đồng thời (`place_order`, mỗi đơn 1 sản phẩm ngẫu nhiên)', '30', '8 s', '≈ 625', '48 ms'],
        ['Tải đọc: full-text + lọc JSONB + gợi ý vector (3 câu/giao dịch)', '20', '8 s', '≈ 1.690', '12 ms'],
      ], 5, 'Kết quả pgbench (máy ảo 2 vCPU, cấu hình PostgreSQL mặc định)'),
    RP('Với một cửa hàng trang sức, vài trăm đơn mỗi giây và gần hai nghìn lượt tìm kiếm mỗi giây là dư thừa so với nhu cầu thực tế, cho thấy một PostgreSQL đơn lẻ với index phù hợp đủ phục vụ mà không cần cache hay hệ thống tìm kiếm riêng.'),
    H2('5.5. Giám sát'),
    H3('5.5.1. pg_stat_statements'),
    RP('Extension này ghi nhận mọi câu SQL đã chuẩn hoá: số lần gọi, tổng/trung bình thời gian, số dòng, tỉ lệ cache hit. Trang quản trị hiển thị top 25 câu theo tổng thời gian hoặc số lần gọi và có nút reset. Nhờ đó dễ phát hiện câu nào cần thêm index: ví dụ sau khi seed, câu tính embedding chiếm nhiều thời gian nhất (3.033 lần gọi) – hợp lý vì chạy một lần; các API trang khách đều có trung bình dưới 1 ms.'),
    H3('5.5.2. Thống kê bảng, index, partition'),
    RP('Các view hệ thống `pg_stat_user_tables`, `pg_stat_user_indexes`, `pg_inherits` cùng hàm `pg_relation_size()` cho biết số dòng, dung lượng, số lần quét tuần tự/quét index của từng bảng và số lần mỗi index được dùng. Index có `idx_scan = 0` lâu ngày là ứng viên để xoá. Trang quản trị trình bày các số liệu này (Hình 3.8).'),
    H3('5.5.3. Grafana'),
    RP('Container Grafana được cấu hình sẵn datasource PostgreSQL và dashboard “Jewelry Shop – PostgreSQL Monitor” gồm 12 panel: kết nối đang mở, dung lượng CSDL, tỉ lệ cache hit, số giao dịch, đơn và doanh thu hôm nay, đơn theo giờ 7 ngày, doanh thu 30 ngày (từ materialized view), top câu SQL, index usage, số dòng từng partition, sản phẩm sắp hết hàng. Dashboard tự làm mới mỗi 10 giây và không cần Prometheus vì Grafana truy vấn SQL trực tiếp.'),
    ...code(`-- Ví dụ panel "Cache hit %" trong monitoring/grafana/dashboards/jewelry-monitor.json
SELECT round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2) AS cache_hit
FROM pg_stat_database WHERE datname = 'jewelry';`),
    pageBreak(),
  ];
}

function conclusion() {
  return [
    H1('Kết luận'),
    H2('1. Kết quả đạt được'),
    RP('Tiểu luận đã xây dựng hoàn chỉnh một hệ thống bán hàng trang sức trên PostgreSQL 16 gồm lược đồ 8 bảng với đầy đủ ràng buộc, 6 file migration bằng SQL thuần, backend Node.js/Fastify không dùng ORM, frontend Next.js cho khách hàng và quản trị viên, đóng gói Docker Compose kèm Grafana. Quan trọng hơn, mỗi tính năng nổi bật của PostgreSQL được gắn với một bài toán nghiệp vụ thật và được kiểm chứng bằng số liệu:'),
    ...bullets([
      '**JSONB + GIN** giải quyết thuộc tính khác nhau giữa các loại trang sức, lọc nhanh hơn quét tuần tự 28 lần.',
      '**Full-text search tiếng Việt** với unaccent và pg_trgm cho phép tìm không dấu, gõ sai chính tả, gợi ý khi gõ – không cần Elasticsearch.',
      '**pgvector + HNSW** mang tính năng gợi ý sản phẩm tương tự theo hướng AI vào ngay CSDL.',
      '**Partitioning + BRIN** giữ bảng đơn hàng gọn khi dữ liệu tăng; partition pruning chỉ quét đúng tháng cần.',
      '**Transaction + SELECT FOR UPDATE** trong hàm PL/pgSQL bảo đảm không bán quá tồn kho, kiểm chứng với 50 client đồng thời.',
      '**Materialized view + LISTEN/NOTIFY** cho dashboard nhanh gấp 150 lần và cảnh báo thời gian thực mà không cần Redis hay hàng đợi.',
    ]),
    RP('Qua đó nhóm rút ra nhận định: PostgreSQL không chỉ là một CSDL quan hệ mà là một nền tảng dữ liệu đa mô hình; với một hệ thống thương mại điện tử quy mô vừa, việc tận dụng đúng các tính năng của PostgreSQL có thể thay thế nhiều thành phần hạ tầng riêng lẻ, giảm chi phí vận hành và độ phức tạp.'),
    H2('2. Hạn chế'),
    ...bullets([
      'Embedding cho pgvector dùng kỹ thuật feature hashing nên chỉ phản ánh tương đồng về từ khoá/thuộc tính, chưa phải “hiểu” ngữ nghĩa hay hình ảnh như mô hình AI thật.',
      'Chưa có từ điển tiếng Việt cho full-text search (tách từ ghép, từ đồng nghĩa); hiện xử lý ở mức bỏ dấu và trigram.',
      'Dữ liệu thử nghiệm mới ở mức vài chục nghìn dòng; chưa đo trên hàng triệu đơn hàng và chưa thử nghiệm replication/high availability.',
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
      'Grafana Labs, *PostgreSQL data source*, https://grafana.com/docs/grafana/latest/datasources/postgres/.',
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
cd ../web && npm install && npm run dev                              # Web :3000

# Benchmark
bash db/benchmark/run_bench.sh explain | order | search | oversell`),
    H2('Phụ lục B. Cấu trúc mã nguồn'),
    ...code(`jewelry-shop-postgres/
├── db/migrations/001_extensions.sql … 006_reports_matview.sql
├── db/seed/seed.sql
├── db/benchmark/{explain_before_after.sql, pgbench_*.sql, oversell_test.sql, run_bench.sh}
├── api/src/{server.js, db.js, migrate.js, seed.js, embed.js, embedding.js}
├── api/src/routes/{catalog.js, search.js, orders.js, admin.js, monitor.js, events.js}
├── web/app/(shop)/…        trang khách hàng
├── web/app/admin/…         trang quản trị
├── monitoring/grafana/     datasource + dashboard
├── docker-compose.yml
└── README.md`),
    H2('Phụ lục C. Mã nguồn SQL đầy đủ'),
    RP('Toàn bộ 6 file migration (khoảng 400 dòng SQL có chú thích tiếng Việt) và file seed được đính kèm trong thư mục `db/` của mã nguồn nộp kèm tiểu luận.'),
  ];
}

module.exports = { chapter4, chapter5, conclusion };
