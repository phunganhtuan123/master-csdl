// Slide báo cáo - chữ to, ít slide, mỗi slide 1 thông điệp
const pptxgen = require('pptxgenjs');
const path = require('path');
const { applyTheme } = require('/root/.claude/skills/synced/91879b9e-0144-4212-bb51-3950dfa56628_22d3ddbc-74b0-4b5b-a461-e8a2fd2bb0c4/pptx/scripts/apply_theme.js');

const IMG = (f) => path.resolve(__dirname, '../img', f);
const OUT = path.resolve(__dirname, '../Slide_CSDL_Nhom6_PostgreSQL.pptx');

const THEME = {
  name: 'Jewelry PostgreSQL',
  headFontFace: 'Arial', bodyFontFace: 'Arial',
  colors: { dk1: '221C14', lt1: 'FFFFFF', dk2: '5B4A2A', lt2: 'F6EFDD', accent1: 'B8902E', accent2: '2B5FA8', accent3: '2E7D4F', accent4: 'B23B3B', accent5: 'E5C56B', accent6: '7A6F60', hlink: '2B5FA8', folHlink: '7A6F60' },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';            // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Xây dựng hệ thống bán hàng trang sức với PostgreSQL';
pres.author = 'Nhóm 6';
const C = pres.SchemeColor;
const W = 13.33, H = 7.5;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: 'DARK', background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.2, w: 11.7, h: 1.8, fontSize: 44, bold: true, color: C.accent5, align: 'left', valign: 'middle', margin: 0 } } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.0, w: 11.7, h: 2.5, fontSize: 22, color: C.background1, align: 'left', valign: 'top', margin: 0 } } },
  ],
});
pres.defineSlideMaster({
  title: 'LIGHT', background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.35, w: 12.1, h: 1.0, fontSize: 36, bold: true, color: C.text1, align: 'left', valign: 'middle', margin: 0 } } },
    { text: { text: 'Nhóm 6 · Tiểu luận CSDL · PostgreSQL', options: { x: 0.6, y: 7.0, w: 8, h: 0.35, fontSize: 12, color: C.accent6, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.35, fontSize: 12, color: C.accent6, align: 'right' },
});

const chip = (slide, text, x, y, w, color = C.accent1) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.5, fill: { color }, line: { color }, rectRadius: 0.25, objectName: 'chip-bg' });
  slide.addText(text, { x, y, w, h: 0.5, fontSize: 16, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'chip' });
};
const stat = (slide, num, label, x, y, w = 2.9, color = C.accent1) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h: 1.9, fill: { color: C.background2 }, line: { color: C.background2 }, rectRadius: 0.15, objectName: 'stat-bg' });
  slide.addText(num, { x, y: y + 0.15, w, h: 1.0, fontSize: 44, bold: true, color, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'stat-num' });
  slide.addText(label, { x: x + 0.15, y: y + 1.15, w: w - 0.3, h: 0.65, fontSize: 16, color: C.text2, align: 'center', valign: 'top', margin: 0, isTextBox: true, objectName: 'stat-label' });
};
const codeBox = (slide, text, x, y, w, h, fontSize = 15) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: C.text1 }, line: { color: C.text1 }, rectRadius: 0.1, objectName: 'code-bg' });
  slide.addText(text.split('\n').map((l, i, a) => ({ text: l, options: { breakLine: i < a.length - 1 } })),
    { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: h - 0.3, fontSize, fontFace: 'Courier New', color: 'F3EAD6', valign: 'top', margin: 0, isTextBox: true, objectName: 'code' });
};
const bullets = (slide, items, x, y, w, h, fontSize = 20) =>
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })),
    { x, y, w, h, fontSize, color: C.text1, valign: 'top', margin: 0, isTextBox: true, objectName: 'bullets' });
const img = (slide, file, x, y, w, h) => slide.addImage({ path: IMG(file), x, y, w, h, sizing: { type: 'contain', w, h }, objectName: file });
const note = (s, t) => s.addNotes(t);

// ====================================================================== 1. Bìa
pres.addSection({ title: 'Mở đầu' });
let s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Mở đầu' });
s.addText('TIỂU LUẬN MÔN CƠ SỞ DỮ LIỆU', { x: 0.8, y: 1.3, w: 11.7, h: 0.6, fontSize: 20, color: C.accent6, margin: 0, isTextBox: true, objectName: 'kicker', charSpacing: 2 });
s.addText('Xây dựng hệ thống bán hàng trang sức với PostgreSQL', { placeholder: 'title' });
s.addText([
  { text: 'Nhóm 6', options: { bold: true, color: C.accent5, breakLine: true } },
  { text: 'Phùng Anh Tuấn – 2541864024', options: { breakLine: true } },
  { text: 'Võ Bùi Duy Thông – 2541864019', options: { breakLine: true } },
  { text: 'Trường Đại học Công nghệ TP.HCM · Viện Đào tạo Sau đại học · 10/2026', options: { fontSize: 16, color: C.accent6 } },
], { placeholder: 'body' });
img(s, 'erd.jpg', 9.6, 5.2, 3.3, 2.0);
note(s, 'Giới thiệu nhóm và đề tài. 1 phút.');

// ====================================================================== 2. Vì sao PostgreSQL
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Mở đầu' });
s.addText('Vì sao chọn PostgreSQL?', { placeholder: 'title' });
stat(s, '#4', 'bảng xếp hạng DB-Engines\n(sau Oracle, MySQL, SQL Server)', 0.6, 1.7);
stat(s, '+21,97', 'điểm nửa đầu 2026 – tăng mạnh nhất\ntrong khi top 3 đều giảm', 3.75, 1.7, 2.9, C.accent3);
stat(s, '4 lần', 'DBMS of the Year\n(2017, 2018, 2020, 2023)', 6.9, 1.7, 2.9, C.accent2);
stat(s, '100%', 'mã nguồn mở, giấy phép tự do\nkhông có bản “Enterprise”', 10.05, 1.7, 2.7, C.accent4);
s.addText('CSDL quan hệ + đa mô hình trong một hệ thống', { x: 0.6, y: 3.95, w: 12, h: 0.6, fontSize: 24, bold: true, color: C.text1, margin: 0, isTextBox: true, objectName: 'sub' });
bullets(s, [
  'JSONB, mảng, full-text search, pgvector… ngay trong SQL chuẩn',
  '6 loại index: B-tree, Hash, GIN, GiST, SP-GiST, BRIN',
  'Partition khai báo, materialized view, trigger, PL/pgSQL, LISTEN/NOTIFY',
  'Cách làm của nhóm: mỗi tính năng gắn 1 nghiệp vụ, có số đo',
], 0.6, 4.6, 12.1, 2.3, 20);
note(s, 'DB-Engines 2026: PostgreSQL #4 nhưng là hệ duy nhất trong top 4 tăng điểm. Nhấn mạnh hướng tiếp cận của nhóm: mỗi tính năng gắn 1 nghiệp vụ và có số đo.');

// ====================================================================== 3. Bài toán -> tính năng
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Mở đầu' });
s.addText('6 đặc thù nghiệp vụ → 6 tính năng PostgreSQL', { placeholder: 'title' });
const rows = [
  ['Mỗi loại trang sức có thuộc tính khác nhau (ni, carat, dài dây…)', 'JSONB + GIN index'],
  ['Khách gõ không dấu, sai chính tả vẫn phải tìm ra', 'Full-text search + unaccent + pg_trgm'],
  ['Gợi ý “sản phẩm giống” khi xem chi tiết', 'pgvector + HNSW'],
  ['Đơn hàng tăng mãi theo thời gian', 'Partitioning theo tháng + BRIN'],
  ['Tồn kho ít, 2 khách mua cùng lúc chiếc cuối', 'Transaction + SELECT … FOR UPDATE'],
  ['Dashboard nhanh, báo hết hàng tức thì', 'Materialized view + LISTEN/NOTIFY'],
];
s.addTable([
  [{ text: 'Đặc thù nghiệp vụ', options: { bold: true, color: C.background1, fill: { color: C.text2 } } }, { text: 'Tính năng PostgreSQL', options: { bold: true, color: C.background1, fill: { color: C.accent1 } } }],
  ...rows.map(([a, b], i) => [{ text: `${i + 1}. ${a}`, options: { fill: { color: i % 2 ? C.background2 : C.background1 } } }, { text: b, options: { bold: true, color: C.accent1, fill: { color: i % 2 ? C.background2 : C.background1 } } }]),
], { x: 0.6, y: 1.6, w: 12.1, colW: [7.1, 5.0], rowH: 0.72, fontSize: 18, color: C.text1, border: { type: 'solid', color: 'E9E1D2', pt: 1 }, valign: 'middle', margin: 0.1, objectName: 'map-table' });
note(s, 'Đây là khung của toàn bộ bài: 6 dòng = 6 phần tiếp theo.');

// ====================================================================== 4. Kiến trúc
pres.addSection({ title: 'Thiết kế' });
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Thiết kế' });
s.addText('Kiến trúc hệ thống', { placeholder: 'title' });
img(s, 'architecture.jpg', 0.6, 1.5, 12.1, 2.9);
chip(s, 'PostgreSQL 16 + pgvector', 0.6, 4.7, 3.6);
chip(s, 'Node.js + Fastify · SQL thuần, không ORM', 4.4, 4.7, 4.6, C.accent2);
chip(s, 'Next.js 15 (khách + admin)', 9.2, 4.7, 3.5, C.accent3);
bullets(s, [
  'Logic quan trọng nằm trong CSDL: hàm place_order(), cancel_order(), trigger NOTIFY',
  '6 file migration SQL, trình chạy migration tự viết 60 dòng, mỗi file = 1 transaction',
  'docker compose up → db + api + web + Grafana; dữ liệu mẫu 3.033 sản phẩm, 30.000 đơn',
], 0.6, 5.4, 12.1, 1.5, 19);

// ====================================================================== 5. ERD
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Thiết kế' });
s.addText('Thiết kế CSDL: 8 bảng', { placeholder: 'title' });
s.addText('Cột tô màu = nơi áp dụng tính năng đặc biệt của PostgreSQL', { x: 0.6, y: 6.5, w: 12.1, h: 0.45, fontSize: 16, italic: true, color: C.text2, margin: 0, isTextBox: true, objectName: 'cap' });
img(s, 'erd.jpg', 0.6, 1.4, 12.1, 5.0);
note(s, 'products: attributes JSONB, search_vec tsvector generated, embedding vector(256). orders: partition theo tháng, total generated. order_items FK 2 cột tới bảng partition.');

// ====================================================================== 6. JSONB
pres.addSection({ title: '6 tính năng' });
const feature = (n, title, color) => {
  const sl = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '6 tính năng' });
  sl.addShape(pres.ShapeType.ellipse, { x: 0.6, y: 0.45, w: 0.8, h: 0.8, fill: { color }, line: { color }, objectName: 'num-bg' });
  sl.addText(String(n), { x: 0.6, y: 0.45, w: 0.8, h: 0.8, fontSize: 28, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'num' });
  sl.addText(title, { x: 1.6, y: 0.3, w: 11.1, h: 1.1, fontSize: 30, bold: true, color: C.text1, valign: 'middle', margin: 0, isTextBox: true, objectName: 'ftitle' });
  return sl;
};
s = feature(1, 'JSONB – thuộc tính sản phẩm linh hoạt', C.accent1);
codeBox(s, `attributes JSONB NOT NULL DEFAULT '{}'
CREATE INDEX idx_products_attributes
  ON products USING GIN (attributes jsonb_path_ops);

-- Nhẫn
{"metal":"Vàng trắng 18K","ring_size":12,
 "stone":"Kim cương","carat":0.5,"clarity":"VS1"}
-- Dây chuyền
{"metal":"Vàng 24K","length_cm":50,"style":"Xích"}

-- Lọc: chất liệu + đá, 1 câu SQL cho mọi tổ hợp
WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}'`, 0.6, 1.55, 7.4, 5.3, 16);
stat(s, '28×', 'nhanh hơn quét tuần tự\n0,056 ms so với 1,57 ms', 8.4, 1.55, 4.3);
bullets(s, ['Không ALTER TABLE khi thêm loại trang sức mới', 'Admin thêm/xoá thuộc tính ngay trên giao diện', 'Bộ lọc bên trái cũng sinh từ JSONB'], 8.4, 3.7, 4.3, 2.3, 18);
note(s, 'Bitmap Index Scan on idx_products_attributes. jsonb_path_ops: index nhỏ hơn, chỉ hỗ trợ @>.');

// ====================================================================== 7. FTS
s = feature(2, 'Full-text search tiếng Việt: không dấu, sai chính tả vẫn tìm ra', C.accent2);
codeBox(s, `-- Hàm bỏ dấu IMMUTABLE để dùng trong index
CREATE FUNCTION vi_unaccent(text) ... IMMUTABLE
  AS $$ SELECT lower(unaccent($1)) $$;

-- tsvector sinh tự động (generated column)
search_vec TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('simple', vi_unaccent(name)) ...) STORED;
CREATE INDEX ... USING GIN (search_vec);
CREATE INDEX ... USING GIN (vi_unaccent(name) gin_trgm_ops);

-- Tầng 1: search_vec @@ plainto_tsquery(vi_unaccent($1))
-- Tầng 2: vi_unaccent(name) % 'nhan kim cuog solitare'`, 0.6, 1.55, 6.9, 4.6, 14);
img(s, '05-tim-kiem-trigram.jpg', 7.8, 1.55, 4.9, 3.0);
s.addText('“nhan kim cuog solitare” → Nhẫn kim cương vàng 18K Solitaire (trigram, similarity 0,44)', { x: 7.8, y: 4.6, w: 4.9, h: 0.8, fontSize: 15, italic: true, color: C.text2, margin: 0, isTextBox: true, objectName: 'cap' });
chip(s, 'FTS nhanh hơn 7×', 7.8, 5.5, 2.3, C.accent2);
chip(s, 'Gợi ý khi gõ: nha:* & kim:*', 10.3, 5.5, 2.4, C.accent6);
s.addText('Không cần Elasticsearch', { x: 0.6, y: 6.3, w: 6.9, h: 0.5, fontSize: 20, bold: true, color: C.accent2, margin: 0, isTextBox: true, objectName: 'punch' });

// ====================================================================== 8. pgvector
s = feature(3, 'pgvector – gợi ý sản phẩm tương tự (AI trong CSDL)', C.accent3);
codeBox(s, `embedding vector(256)
CREATE INDEX idx_products_embedding
  ON products USING hnsw (embedding vector_cosine_ops);

-- 8 sản phẩm gần nhất, <=> = khoảng cách cosine
SELECT name, 1 - (p.embedding <=> me.embedding) AS similarity
FROM products p, (SELECT embedding FROM products WHERE slug=$1) me
ORDER BY p.embedding <=> me.embedding
LIMIT 8;`, 0.6, 1.55, 7.2, 3.1, 14);
bullets(s, [
  'Embedding demo: feature hashing từ tên + danh mục + thuộc tính JSONB (256 chiều, không cần API ngoài)',
  'Thay bằng OpenAI / CLIP sau này: chỉ đổi 1 hàm, schema và SQL giữ nguyên',
  'HNSW: index Scan 0,25 ms so với 1,43 ms tính toàn bộ 3.033 vector',
], 0.6, 4.85, 7.2, 2.1, 17);
img(s, '03-chi-tiet-pgvector.jpg', 8.1, 1.55, 4.6, 5.3);

// ====================================================================== 9. Partition
s = feature(4, 'Partitioning theo tháng + BRIN cho bảng đơn hàng', C.accent4);
codeBox(s, `CREATE TABLE orders (
  id BIGSERIAL, created_at TIMESTAMPTZ NOT NULL, ...
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE orders_2026_10 PARTITION OF orders
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE INDEX ... ON orders USING BRIN (created_at);`, 0.6, 1.55, 7.2, 2.7, 14);
img(s, '10-admin-benchmark-explain.jpg', 0.6, 4.4, 7.2, 2.5);
stat(s, '1 / 13', 'partition được quét\nnhờ partition pruning', 8.1, 1.55, 4.6, C.accent4);
stat(s, '312 kB', 'BRIN so với 1.000 kB B-tree\ncùng cột created_at', 8.1, 3.6, 4.6, C.accent2);
bullets(s, ['Lưu trữ đơn cũ = DETACH 1 partition', 'Tạo tháng mới: ensure_orders_partition()'], 8.1, 5.7, 4.6, 1.2, 17);

// ====================================================================== 10. Transaction
s = feature(5, 'Transaction + SELECT … FOR UPDATE – không bán quá tồn kho', C.accent1);
img(s, 'order_flow.jpg', 0.6, 1.5, 4.6, 5.4);
codeBox(s, `-- place_order(): 1 hàm PL/pgSQL = 1 transaction
FOR r IN
  SELECT p.id, p.name, p.stock, i.qty
  FROM jsonb_to_recordset(p_items) i JOIN products p ...
  ORDER BY p.id     -- khoá cùng thứ tự → không deadlock
  FOR UPDATE OF p   -- giao dịch 2 phải CHỜ giao dịch 1
LOOP
  IF r.stock < r.qty THEN
    RAISE EXCEPTION 'OUT_OF_STOCK: "%" chỉ còn %', ...;
  END IF;
END LOOP;
-- INSERT orders, order_items; UPDATE stock; CHECK(stock>=0)`, 5.5, 1.5, 7.2, 3.6, 14);
stat(s, '5 / 50', 'client mua được khi kho = 5\n45 client bị OUT_OF_STOCK', 5.5, 5.2, 3.5);
stat(s, '625', 'đơn / giây với 30 client\n(pgbench, máy ảo 2 vCPU)', 9.2, 5.2, 3.5, C.accent3);

// ====================================================================== 11. Matview + NOTIFY
s = feature(6, 'Materialized view + LISTEN/NOTIFY cho dashboard', C.accent2);
codeBox(s, `CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT date_trunc('day', created_at)::date AS day,
       count(*) AS orders, sum(total) AS revenue ...
CREATE UNIQUE INDEX ON mv_sales_daily (day);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;

-- Trigger: tồn < 3 → pg_notify('low_stock', json)
-- Node.js: LISTEN low_stock → Server-Sent Events → trình duyệt admin`, 0.6, 1.55, 7.2, 2.9, 14);
stat(s, '150×', 'doanh thu 30 ngày: 0,012 ms\nso với 1,8 ms tính trực tiếp', 0.6, 4.6, 3.5, C.accent2);
stat(s, '< 0,1 s', 'cảnh báo tới admin\nkhông F5, không Redis', 4.3, 4.6, 3.5, C.accent4);
img(s, '13-admin-notify-sse.jpg', 8.1, 1.55, 4.6, 2.8);
img(s, '07-admin-dashboard.jpg', 8.1, 4.5, 4.6, 2.4);

// ====================================================================== 12. Index khác
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: '6 tính năng' });
s.addText('Các index và cột đặc biệt khác', { placeholder: 'title' });
s.addTable([
  [{ text: 'Loại', options: { bold: true, color: C.background1, fill: { color: C.text2 } } }, { text: 'Trong hệ thống', options: { bold: true, color: C.background1, fill: { color: C.text2 } } }, { text: 'Lợi ích đo được', options: { bold: true, color: C.background1, fill: { color: C.accent1 } } }],
  ['Partial index', { text: 'products (stock, id) WHERE stock < 3', options: { fontFace: 'Courier New', fontSize: 15 } }, '40 kB thay vì 168 kB; 0,018 ms (16×)'],
  ['Covering index (INCLUDE)', { text: 'orders (customer_id, created_at) INCLUDE (status, total)', options: { fontFace: 'Courier New', fontSize: 15 } }, 'Index Only Scan, Heap Fetches = 0'],
  ['Expression index', { text: 'customers (lower(email))', options: { fontFace: 'Courier New', fontSize: 15 } }, 'Tìm email không phân biệt hoa thường'],
  ['Generated column', { text: 'total = subtotal + shipping_fee\nsearch_vec = to_tsvector(...)', options: { fontFace: 'Courier New', fontSize: 15 } }, 'CSDL tự tính, app không ghi sai được'],
  ['GIN / HNSW / BRIN', { text: 'JSONB, tsvector, trigram, vector, thời gian', options: { fontFace: 'Courier New', fontSize: 15 } }, '2,5× – 28× so với quét tuần tự'],
], { x: 0.6, y: 1.6, w: 12.1, colW: [3.0, 5.2, 3.9], rowH: 0.78, fontSize: 18, color: C.text1, border: { type: 'solid', color: 'E9E1D2', pt: 1 }, valign: 'middle', margin: 0.1, objectName: 'index-table' });
s.addText('Mỗi index gắn với đúng 1 truy vấn của ứng dụng – theo dõi lượt dùng bằng pg_stat_user_indexes', { x: 0.6, y: 6.3, w: 12.1, h: 0.5, fontSize: 18, italic: true, color: C.text2, margin: 0, isTextBox: true, objectName: 'punch' });

// ====================================================================== 13. Demo
pres.addSection({ title: 'Ứng dụng & kết quả' });
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Ứng dụng & kết quả' });
s.addText('Ứng dụng: trang bán hàng và trang quản trị', { placeholder: 'title' });
img(s, '01-trang-chu.jpg', 0.6, 1.5, 3.9, 4.3);
img(s, '02-danh-sach-loc-jsonb.jpg', 4.7, 1.5, 3.9, 4.3);
img(s, '09-admin-san-pham-jsonb.jpg', 8.8, 1.5, 3.9, 4.3);
s.addText('Trang chủ · Lọc JSONB · Admin sửa thuộc tính & nhập kho  —  demo trực tiếp: tìm kiếm, đặt hàng, cảnh báo real-time, benchmark EXPLAIN', { x: 0.6, y: 6.0, w: 12.1, h: 0.9, fontSize: 17, color: C.text2, margin: 0, isTextBox: true, objectName: 'cap' });

// ====================================================================== 14. Benchmark
s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Ứng dụng & kết quả' });
s.addText('Benchmark: có index nhanh hơn bao nhiêu lần?', { placeholder: 'title' });
s.addChart(pres.ChartType.bar, [{
  name: 'Nhanh hơn (lần)',
  labels: ['Materialized view', 'JSONB @> (GIN)', 'Partial index', 'Full-text (GIN)', 'Partition pruning', 'pgvector HNSW', 'Trigram'],
  values: [150, 28, 16, 7, 5.9, 5.6, 2.5],
}], {
  x: 0.6, y: 1.5, w: 7.6, h: 5.3, barDir: 'bar',
  chartColors: [THEME.colors.accent1], showLegend: false,
  showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 14, dataLabelColor: THEME.colors.dk1, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '0.#"×"',
  catAxisLabelFontSize: 15, catAxisLabelColor: THEME.colors.dk1, catAxisLabelFontFace: '+mn-lt', catGridLine: { style: 'none' },
  valAxisLabelFontSize: 12, valAxisLabelColor: THEME.colors.accent6, valAxisLabelFontFace: '+mn-lt', valGridLine: { color: 'E9E1D2', size: 1 }, valAxisHidden: true,
  showTitle: false, objectName: 'speedup-chart',
});
stat(s, '1.690', 'truy vấn đọc / giây\n(FTS + JSONB + vector)', 8.6, 1.5, 4.1, C.accent3);
stat(s, '625', 'đơn hàng / giây\n30 client đồng thời', 8.6, 3.6, 4.1, C.accent2);
bullets(s, ['Giám sát: pg_stat_statements, pg_stat_user_indexes, Grafana', 'Dữ liệu: 3.033 SP, 35.000 đơn'], 8.6, 5.7, 4.1, 1.2, 16);

// ====================================================================== 15. Kết luận
pres.addSection({ title: 'Kết luận' });
s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Kết luận' });
s.addText('Kết luận', { placeholder: 'title', options: {} });
s.addText([
  { text: 'PostgreSQL = CSDL quan hệ + đa mô hình: một hệ thống thay cho search engine, cache, hàng đợi, vector DB', options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
  { text: '6 tính năng × 6 nghiệp vụ, đều có số đo: 2,5× – 150×, 50 client không bán quá kho', options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
  { text: 'Hướng phát triển: embedding CLIP theo ảnh, từ điển tiếng Việt, pg_cron, replication', options: { bullet: true } },
], { placeholder: 'body' });
s.addText('Cảm ơn cô và các bạn đã lắng nghe!', { x: 0.8, y: 6.6, w: 11.7, h: 0.6, fontSize: 24, bold: true, color: C.accent5, margin: 0, isTextBox: true, objectName: 'thanks' });

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('wrote', OUT);
})();
