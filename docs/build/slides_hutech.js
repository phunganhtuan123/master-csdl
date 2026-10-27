// Slide báo cáo theo template bài giảng HUTECH (4:3, thanh xanh 2A10B4, logo góc trái, Trebuchet MS / Arial)
const pptxgen = require('pptxgenjs');
const path = require('path');
const { applyTheme } = require('/root/.claude/skills/synced/91879b9e-0144-4212-bb51-3950dfa56628_22d3ddbc-74b0-4b5b-a461-e8a2fd2bb0c4/pptx/scripts/apply_theme.js');

const IMG = (f) => path.resolve(__dirname, '../img', f);
const OUT = path.resolve(__dirname, '../Slide_CSDL_Nhom6_PostgreSQL.pptx');

const BLUE = '2A10B4', YELLOW = 'FFD54A', GRAY = 'D6D6D6', LIGHT = 'EEF0FA', INK = '1A1A1A';
const THEME = {
  name: 'HUTECH', headFontFace: 'Trebuchet MS', bodyFontFace: 'Arial',
  colors: { dk1: INK, lt1: 'FFFFFF', dk2: BLUE, lt2: LIGHT, accent1: BLUE, accent2: 'FFC000', accent3: '1E8E3E', accent4: 'C62828', accent5: '0B7285', accent6: '666666', hlink: BLUE, folHlink: '666666' },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_4x3';          // 10 x 7.5 in — giống slide bài giảng
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Xây dựng hệ thống bán hàng trang sức với PostgreSQL';
pres.author = 'Nhóm 6';
const C = pres.SchemeColor;

// ---------- Layout nội dung: logo + "HUTECH University", thanh tiêu đề xanh, thanh dọc trái, số trang ----------
pres.defineSlideMaster({
  title: 'HUTECH', background: { color: 'FFFFFF' },
  objects: [
    { image: { path: IMG('tpl/hutech-logo.jpg'), x: 0.04, y: 0.03, w: 0.5, h: 0.5 } },
    { text: { text: 'HUTECH University', options: { x: 0.58, y: 0.05, w: 4, h: 0.42, fontFace: 'Arial', fontSize: 18, color: INK, margin: 0, valign: 'middle' } } },
    { rect: { x: 0.55, y: 0.5, w: 9.45, h: 0.82, fill: { color: BLUE } } },
    { rect: { x: 0, y: 1.32, w: 0.55, h: 6.18, fill: { color: BLUE } } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 0.5, w: 9.2, h: 0.82, fontFace: 'Trebuchet MS', fontSize: 28, bold: true, color: 'FFFFFF', align: 'left', valign: 'middle', margin: 0 } } },
  ],
  slideNumber: { x: 9.3, y: 7.1, w: 0.5, h: 0.3, fontFace: 'Arial', fontSize: 11, color: INK, align: 'right' },
});

// ---------- Helpers ----------
const X0 = 0.8, W0 = 8.9;      // vùng nội dung
const T = (slide, text, o) => slide.addText(text, { fontFace: 'Arial', color: INK, margin: 0, isTextBox: true, valign: 'top', ...o });
const bullets = (slide, items, x, y, w, h, fontSize = 18) =>
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontFace: 'Arial', fontSize, color: INK, valign: 'top', margin: 0, isTextBox: true, objectName: 'bullets' });
const codeBox = (slide, text, x, y, w, h, fontSize = 13) => {
  slide.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: 'F4F4F4' }, line: { color: 'BBBBBB', width: 0.75 }, objectName: 'code-bg' });
  slide.addText(text.split('\n').map((l, i, a) => ({ text: l, options: { breakLine: i < a.length - 1 } })),
    { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: h - 0.16, fontSize, fontFace: 'Courier New', color: '222222', valign: 'top', margin: 0, isTextBox: true, objectName: 'code' });
};
const stat = (slide, num, label, x, y, w, color = BLUE) => {
  slide.addShape(pres.ShapeType.rect, { x, y, w, h: 1.45, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'stat-bg' });
  T(slide, num, { x, y: y + 0.08, w, h: 0.75, fontSize: 32, bold: true, color, align: 'center', valign: 'middle', objectName: 'stat-num' });
  T(slide, label, { x: x + 0.1, y: y + 0.85, w: w - 0.2, h: 0.55, fontSize: 12, color: '333333', align: 'center', objectName: 'stat-label' });
};
const pill = (slide, n, text, x, y, w) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.55, fill: { color: 'FFFFFF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.12, shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, color: '000000', opacity: 0.25 }, objectName: 'pill' });
  slide.addShape(pres.ShapeType.ellipse, { x: x + 0.1, y: y + 0.08, w: 0.39, h: 0.39, fill: { color: BLUE }, line: { color: BLUE }, objectName: 'pill-dot' });
  T(slide, String(n), { x: x + 0.1, y: y + 0.08, w: 0.39, h: 0.39, fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
  T(slide, text, { x: x + 0.6, y, w: w - 0.7, h: 0.55, fontSize: 15, valign: 'middle' });
};
const img = (slide, file, x, y, w, h) => slide.addImage({ path: IMG(file), x, y, w, h, sizing: { type: 'contain', w, h }, objectName: file });
// Bảng kiểu template: header xám đậm chữ đen, dòng xen kẽ xám nhạt, viền đen mảnh
const table = (slide, header, rows, x, y, w, colW, fontSize = 14, rowH = 0.5) =>
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, fill: { color: GRAY }, align: 'center' } })),
    ...rows.map((r, i) => r.map((c) => (typeof c === 'string' ? { text: c, options: { fill: { color: i % 2 ? 'F2F2F2' : 'FFFFFF' } } } : { ...c, options: { ...c.options, fill: { color: i % 2 ? 'F2F2F2' : 'FFFFFF' } } }))),
  ], { x, y, w, colW, rowH, fontFace: 'Arial', fontSize, color: INK, border: { type: 'solid', color: '000000', pt: 0.75 }, valign: 'middle', margin: 0.06, objectName: 'table' });
const content = (title, section) => { const s = pres.addSlide({ masterName: 'HUTECH', sectionTitle: section }); s.addText(title, { placeholder: 'title' }); return s; };

// ====================================================================== 1. Bìa (giống slide 1 của cô)
pres.addSection({ title: 'Mở đầu' });
let s = pres.addSlide({ sectionTitle: 'Mở đầu' });
s.background = { color: 'FFFFFF' };
s.addImage({ path: IMG('tpl/building.jpg'), x: 0, y: 1.8, w: 1.85, h: 5.7, sizing: { type: 'cover', w: 1.85, h: 5.7 }, transparency: 55, objectName: 'building' });
s.addImage({ path: IMG('tpl/hutech-logo.jpg'), x: 0.12, y: 0.1, w: 1.6, h: 1.6, objectName: 'logo' });
T(s, 'HUTECH University', { x: 2.05, y: 0.6, w: 6, h: 0.7, fontSize: 30, valign: 'middle' });
s.addShape(pres.ShapeType.rect, { x: 1.85, y: 1.8, w: 8.15, h: 5.7, fill: { color: BLUE }, line: { color: BLUE }, objectName: 'cover-bg' });
T(s, 'TIỂU LUẬN MÔN CƠ SỞ DỮ LIỆU', { x: 2.1, y: 2.3, w: 7.7, h: 0.5, fontSize: 16, color: YELLOW, align: 'center', fontFace: 'Trebuchet MS', charSpacing: 2 });
T(s, 'XÂY DỰNG HỆ THỐNG BÁN HÀNG TRANG SỨC VỚI POSTGRESQL', { x: 2.1, y: 2.9, w: 7.7, h: 1.6, fontSize: 28, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Trebuchet MS' });
T(s, 'Nhóm 6', { x: 2.1, y: 4.9, w: 7.7, h: 0.45, fontSize: 20, bold: true, color: YELLOW, align: 'center' });
T(s, [
  { text: 'Phùng Anh Tuấn – 2541864024', options: { breakLine: true } },
  { text: 'Võ Bùi Duy Thông – 2541864019' },
], { x: 2.1, y: 5.4, w: 7.7, h: 0.9, fontSize: 18, color: 'FFFFFF', align: 'center' });
T(s, 'GVHD: ……………………………   ·   Tháng 10/2026', { x: 2.1, y: 6.55, w: 7.7, h: 0.4, fontSize: 14, color: 'DDDDFF', align: 'center' });
s.addNotes('Giới thiệu nhóm và đề tài.');

// ====================================================================== 2. Nội dung (giống slide "Nội dung" của cô)
s = content('Nội dung', 'Mở đầu');
const toc = ['Vì sao chọn PostgreSQL', 'Kiến trúc hệ thống & thiết kế CSDL', '6 tính năng nổi bật gắn với nghiệp vụ', 'Các loại index đặc biệt', 'Ứng dụng demo & benchmark', 'Kết luận'];
toc.forEach((t, i) => pill(s, i + 1, t, 1.3, 1.65 + i * 0.85, 7.6));

// ====================================================================== 3. Vì sao PostgreSQL
s = content('Vì sao chọn PostgreSQL?', 'Mở đầu');
stat(s, '#4', 'DB-Engines (sau Oracle,\nMySQL, SQL Server)', X0, 1.6, 2.1);
stat(s, '+21,97', 'điểm nửa đầu 2026\ntăng mạnh nhất top 5', X0 + 2.27, 1.6, 2.1, THEME.colors.accent3);
stat(s, '4 lần', 'DBMS of the Year\n2017 · 2018 · 2020 · 2023', X0 + 4.54, 1.6, 2.1, THEME.colors.accent5);
stat(s, '100%', 'mã nguồn mở, không có\nbản Enterprise thu phí', X0 + 6.81, 1.6, 2.09, THEME.colors.accent4);
T(s, 'CSDL quan hệ + đa mô hình trong một hệ thống', { x: X0, y: 3.35, w: W0, h: 0.5, fontSize: 20, bold: true, color: BLUE });
bullets(s, [
  'JSONB, mảng, full-text search, pgvector… ngay trong SQL chuẩn',
  '6 loại index: B-tree, Hash, GIN, GiST, SP-GiST, BRIN',
  'Partition khai báo, materialized view, trigger, PL/pgSQL, LISTEN/NOTIFY',
  'Nhiều nhóm cùng chọn PostgreSQL → nhóm 6 làm theo cách: mỗi tính năng gắn 1 nghiệp vụ thật và có số đo',
], X0, 3.95, W0, 3.0, 17);

// ====================================================================== 4. Đặc thù → tính năng
s = content('6 đặc thù nghiệp vụ – 6 tính năng PostgreSQL', 'Mở đầu');
table(s, ['Đặc thù bán trang sức', 'Tính năng PostgreSQL'], [
  ['1. Mỗi loại trang sức có thuộc tính khác nhau (ni, carat, dài dây…)', { text: 'JSONB + GIN index', options: { bold: true, color: BLUE } }],
  ['2. Khách gõ không dấu, sai chính tả vẫn phải tìm ra', { text: 'Full-text search + unaccent + pg_trgm', options: { bold: true, color: BLUE } }],
  ['3. Gợi ý “sản phẩm giống” khi xem chi tiết', { text: 'pgvector + HNSW', options: { bold: true, color: BLUE } }],
  ['4. Đơn hàng tăng mãi theo thời gian', { text: 'Partitioning theo tháng + BRIN', options: { bold: true, color: BLUE } }],
  ['5. Tồn kho ít, 2 khách mua cùng lúc chiếc cuối', { text: 'Transaction + SELECT … FOR UPDATE', options: { bold: true, color: BLUE } }],
  ['6. Dashboard nhanh, báo hết hàng tức thì', { text: 'Materialized view + LISTEN/NOTIFY', options: { bold: true, color: BLUE } }],
], X0, 1.65, W0, [5.2, 3.7], 15, 0.72);

// ====================================================================== 5. Kiến trúc
pres.addSection({ title: 'Thiết kế' });
s = content('Kiến trúc hệ thống', 'Thiết kế');
img(s, 'architecture.jpg', X0, 1.55, W0, 2.1);
bullets(s, [
  'PostgreSQL 16 + pgvector · Node.js + Fastify, SQL thuần (không ORM) · Next.js 15 (khách + admin)',
  'Logic quan trọng nằm trong CSDL: hàm place_order(), cancel_order(), trigger NOTIFY',
  '6 file migration SQL; trình chạy migration tự viết 60 dòng, mỗi file = 1 transaction',
  'docker compose up → db + api + web; npm run seed:big → 1 triệu đơn, npm run bench → báo cáo đo',
], X0, 3.85, W0, 3.1, 17);

// ====================================================================== 6. ERD
s = content('Thiết kế CSDL: 8 bảng', 'Thiết kế');
img(s, 'erd.jpg', X0, 1.5, W0, 5.0);
T(s, 'Cột tô màu = nơi áp dụng tính năng đặc biệt của PostgreSQL', { x: X0, y: 6.6, w: W0, h: 0.4, fontSize: 14, italic: true, color: '444444' });
s.addNotes('products: attributes JSONB, search_vec tsvector generated, embedding vector(256). orders: partition theo tháng, total generated.');

// ====================================================================== 7–12. Sáu tính năng
pres.addSection({ title: '6 tính năng' });
const feature = (n, title) => content(`${n}. ${title}`, '6 tính năng');

s = feature(1, 'JSONB – thuộc tính sản phẩm linh hoạt');
codeBox(s, `attributes JSONB NOT NULL DEFAULT '{}'
CREATE INDEX idx_products_attributes
  ON products USING GIN (attributes jsonb_path_ops);

-- Nhẫn
{"metal":"Vàng trắng 18K","ring_size":12,
 "stone":"Kim cương","carat":0.5}
-- Dây chuyền
{"metal":"Vàng 24K","length_cm":50}

-- Lọc: 1 câu SQL cho mọi tổ hợp thuộc tính
WHERE attributes @>
  '{"metal":"Vàng 18K","stone":"Kim cương"}'`, X0, 1.55, 5.6, 4.0, 13);
stat(s, '34×', 'nhanh hơn quét tuần tự\n0,06 ms so với 2,1 ms', 6.6, 1.55, 3.1);
bullets(s, ['Không ALTER TABLE khi thêm loại trang sức mới', 'Admin thêm/xoá thuộc tính ngay trên giao diện', 'Bộ lọc bên trái cũng sinh từ JSONB'], 6.6, 3.2, 3.1, 2.4, 14);
T(s, 'Planner: Bitmap Index Scan on idx_products_attributes', { x: X0, y: 5.7, w: W0, h: 0.4, fontSize: 14, italic: true, color: '444444' });

s = feature(2, 'Full-text search tiếng Việt');
codeBox(s, `-- Hàm bỏ dấu, IMMUTABLE để dùng trong index
CREATE FUNCTION vi_unaccent(text) ... IMMUTABLE
  AS $$ SELECT lower(unaccent($1)) $$;

-- tsvector sinh tự động (generated column)
search_vec TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('simple', vi_unaccent(name)) ...) STORED;
CREATE INDEX ... USING GIN (search_vec);
CREATE INDEX ... USING GIN (vi_unaccent(name) gin_trgm_ops);

-- Tầng 1: search_vec @@ plainto_tsquery(vi_unaccent($1))
-- Tầng 2: vi_unaccent(name) % 'nhan kim cuog solitare'`, X0, 1.55, 5.6, 3.6, 12);
img(s, '05-tim-kiem-trigram.jpg', 6.6, 1.55, 3.1, 1.95);
T(s, '“nhan kim cuog solitare” → Nhẫn kim cương vàng 18K Solitaire (trigram 0,44)', { x: 6.6, y: 3.55, w: 3.1, h: 0.9, fontSize: 12, italic: true, color: '444444' });
stat(s, '9,6×', 'FTS có GIN so với\nquét tuần tự', 6.6, 4.55, 3.1);
bullets(s, ['Không dấu / có dấu đều khớp, xếp hạng ts_rank, tô đậm ts_headline', 'Gõ sai chính tả → tự chuyển sang trigram (pg_trgm)', 'Gợi ý khi gõ bằng prefix search  nha:* & kim:*  — không cần Elasticsearch'], X0, 5.3, 5.6, 1.7, 14);

s = feature(3, 'pgvector – gợi ý sản phẩm tương tự');
codeBox(s, `embedding vector(256)
CREATE INDEX idx_products_embedding
  ON products USING hnsw (embedding vector_cosine_ops);

-- 8 sản phẩm gần nhất, <=> = khoảng cách cosine
SELECT name,
       1 - (p.embedding <=> me.embedding) AS sim
FROM products p,
     (SELECT embedding FROM products
      WHERE slug = $1) me
ORDER BY p.embedding <=> me.embedding
LIMIT 8;`, X0, 1.55, 5.6, 3.0, 12);
img(s, '03-chi-tiet-pgvector.jpg', 6.6, 1.55, 3.1, 4.0);
bullets(s, [
  'Embedding demo bằng feature hashing: tên + danh mục + thuộc tính JSONB → 256 chiều, không cần API ngoài',
  'Thay bằng OpenAI / CLIP sau này chỉ đổi 1 hàm; schema và SQL giữ nguyên',
  'HNSW: 0,23 ms so với 1,7 ms khi tính khoảng cách cho toàn bộ 3.033 vector (7,4×)',
], X0, 4.7, 5.6, 2.3, 14);

s = feature(4, 'Partitioning theo tháng + BRIN');
codeBox(s, `CREATE TABLE orders (
  id BIGSERIAL, created_at TIMESTAMPTZ NOT NULL, ...
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_10 PARTITION OF orders
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE INDEX ... ON orders USING BRIN (created_at);`, X0, 1.55, 5.6, 2.6, 12);
stat(s, '1 / 37', 'partition được quét\n(1 triệu đơn) nhờ pruning', 6.6, 1.55, 3.1, THEME.colors.accent4);
stat(s, '888 kB', 'BRIN so với 23 MB\nB-tree cùng cột (26×)', 6.6, 3.15, 3.1, THEME.colors.accent5);
img(s, '10-admin-benchmark-explain.jpg', X0, 4.3, 5.6, 2.1);
bullets(s, ['Doanh thu 2 tuần: 3,3 ms so với 66 ms (20×)', 'Lưu trữ đơn cũ = DETACH 1 partition', 'Tháng mới: ensure_orders_partition()'], 6.6, 4.75, 3.1, 2.2, 13);

s = feature(5, 'Transaction + FOR UPDATE – chống bán quá kho');
img(s, 'order_flow.jpg', X0, 1.5, 3.0, 5.5);
codeBox(s, `-- place_order(): 1 hàm PL/pgSQL = 1 transaction
FOR r IN
  SELECT p.id, p.name, p.stock, i.qty
  FROM jsonb_to_recordset(p_items) i
  JOIN products p ON p.id = i.product_id
  ORDER BY p.id    -- khoá cùng thứ tự, tránh deadlock
  FOR UPDATE OF p  -- giao dịch 2 phải CHỜ giao dịch 1
LOOP
  IF r.stock < r.qty THEN
    RAISE EXCEPTION 'OUT_OF_STOCK: % chỉ còn %', ...;
  END IF;
END LOOP;
-- INSERT orders, order_items; UPDATE stock;
-- CHECK (stock >= 0) là hàng rào cuối cùng`, 4.0, 1.5, 5.7, 3.55, 12);
stat(s, '5 / 50', 'client mua được khi kho = 5\n45 client bị OUT_OF_STOCK', 4.0, 5.3, 2.75);
stat(s, '1.090', 'đơn / giây với 30 client\ntrên CSDL 1 triệu đơn', 6.95, 5.3, 2.75, THEME.colors.accent3);

s = feature(6, 'Materialized view + LISTEN/NOTIFY');
codeBox(s, `CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT date_trunc('day', created_at)::date AS day,
       count(*) AS orders, sum(total) AS revenue ...
CREATE UNIQUE INDEX ON mv_sales_daily (day);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;

-- Trigger: stock < 3 → pg_notify('low_stock', json)
-- Node.js: LISTEN low_stock → SSE → trình duyệt admin`, X0, 1.55, 5.6, 2.5, 12);
img(s, '13-admin-notify-sse.jpg', 6.6, 1.55, 3.1, 1.9);
stat(s, '1.000×', 'doanh thu 30 ngày: 0,018 ms\nso với 19 ms tính trực tiếp', X0, 4.25, 2.7, THEME.colors.accent5);
stat(s, '< 0,1 s', 'cảnh báo tới admin\nkhông F5, không Redis', X0 + 2.9, 4.25, 2.7, THEME.colors.accent4);
img(s, '07-admin-dashboard.jpg', 6.6, 3.6, 3.1, 3.4);
bullets(s, ['REFRESH CONCURRENTLY: không chặn người đọc', 'Số liệu “hôm nay” tính trực tiếp trên partition tháng này'], X0, 5.9, 5.6, 1.1, 13);

// ====================================================================== 13. Index khác
s = content('Các loại index đặc biệt khác', '6 tính năng');
table(s, ['Loại', 'Trong hệ thống', 'Lợi ích đo được'], [
  ['Partial index', { text: 'orders (created_at) WHERE status IN (pending, confirmed)', options: { fontFace: 'Courier New', fontSize: 12 } }, '0,2 ms so với 98 ms trên 1 triệu đơn (480×)'],
  ['Covering index (INCLUDE)', { text: 'orders (customer_id, created_at) INCLUDE (id, status, total)', options: { fontFace: 'Courier New', fontSize: 12 } }, 'Index Only Scan, Heap Fetches = 0; 250×'],
  ['Expression index', { text: 'customers (lower(email))', options: { fontFace: 'Courier New', fontSize: 12 } }, 'Tìm email không phân biệt hoa thường'],
  ['Generated column', { text: 'total = subtotal + shipping_fee\nsearch_vec = to_tsvector(...)', options: { fontFace: 'Courier New', fontSize: 12 } }, 'CSDL tự tính, app không ghi sai được'],
  ['GIN / HNSW / BRIN', { text: 'JSONB, tsvector, trigram, vector, thời gian', options: { fontFace: 'Courier New', fontSize: 12 } }, '2,6× – 34× so với quét tuần tự'],
], X0, 1.65, W0, [2.2, 3.9, 2.8], 14, 0.75);
T(s, 'Mỗi index gắn với đúng 1 truy vấn của ứng dụng — theo dõi lượt dùng bằng pg_stat_user_indexes', { x: X0, y: 6.3, w: W0, h: 0.5, fontSize: 14, italic: true, color: '444444' });

// ====================================================================== 14. Demo
pres.addSection({ title: 'Ứng dụng & kết quả' });
s = content('Ứng dụng: trang bán hàng và trang quản trị', 'Ứng dụng & kết quả');
img(s, '01-trang-chu.jpg', X0, 1.55, 2.85, 3.6);
img(s, '02-danh-sach-loc-jsonb.jpg', X0 + 3.02, 1.55, 2.85, 3.6);
img(s, '09-admin-san-pham-jsonb.jpg', X0 + 6.04, 1.55, 2.86, 3.6);
T(s, 'Trang chủ  ·  Lọc JSONB  ·  Admin: sửa thuộc tính & nhập kho', { x: X0, y: 5.25, w: W0, h: 0.4, fontSize: 14, align: 'center', color: '444444' });
bullets(s, ['Demo trực tiếp: tìm kiếm không dấu / sai chính tả, đặt hàng chiếc cuối từ 2 trình duyệt, cảnh báo real-time, trang Monitor & Benchmark chạy EXPLAIN'], X0, 5.8, W0, 1.2, 16);

// ====================================================================== 15. Benchmark
s = content('Benchmark: có index nhanh hơn bao nhiêu?', 'Ứng dụng & kết quả');
s.addChart(pres.ChartType.bar, [{
  name: 'Nhanh hơn (lần)',
  labels: ['Materialized view', 'Partial index', 'Covering index', 'JSONB @> (GIN)', 'Partition pruning', 'Full-text (GIN)', 'pgvector HNSW', 'Trigram'],
  values: [1077, 484, 251, 34, 20, 9.6, 7.4, 2.6],
}], {
  x: X0, y: 1.5, w: 5.7, h: 5.4, barDir: 'bar',
  chartColors: [BLUE], showLegend: false,
  showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 12, dataLabelColor: INK, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '0.#"×"',
  catAxisLabelFontSize: 12, catAxisLabelColor: INK, catAxisLabelFontFace: '+mn-lt', catGridLine: { style: 'none' },
  valAxisHidden: true, valAxisLogScaleBase: 10, valGridLine: { color: 'E0E0E0', size: 1 }, valAxisLabelFontFace: '+mn-lt', valAxisLabelColor: '666666', valAxisLabelFontSize: 10,
  showTitle: false, objectName: 'speedup-chart',
});
stat(s, '1 triệu', 'đơn hàng / 37 partition\nnpm run seed:big', 6.7, 1.55, 3.0, THEME.colors.accent3);
stat(s, '1.090', 'đơn hàng / giây\n30 client đồng thời', 6.7, 3.15, 3.0, THEME.colors.accent5);
bullets(s, ['Tool đo npm run bench: 12 kịch bản × 5 lần, lấy trung vị, xuất Markdown/JSON', 'Giám sát: pg_stat_statements, trang Monitor trong admin'], 6.7, 4.8, 3.0, 2.1, 13);

// ====================================================================== 16. Kết luận
pres.addSection({ title: 'Kết luận' });
s = content('Kết luận', 'Kết luận');
bullets(s, [
  'PostgreSQL = CSDL quan hệ + đa mô hình: một hệ thống thay cho search engine, cache, hàng đợi và vector DB',
  '6 tính năng gắn 6 nghiệp vụ, đo trên 1 triệu đơn: nhanh hơn 2,6× – 1.000×; 50 client đồng thời không bán quá kho',
  'Hạn chế: embedding feature hashing, chưa có từ điển tiếng Việt, chưa tinh chỉnh tham số PostgreSQL',
  'Hướng phát triển: embedding CLIP theo ảnh, pg_cron tự tạo partition & refresh, replication',
], X0, 1.65, W0, 4.2, 18);
T(s, 'Cảm ơn cô và các bạn đã lắng nghe!', { x: X0, y: 6.0, w: W0, h: 0.8, fontSize: 28, bold: true, color: BLUE, align: 'center', fontFace: 'Trebuchet MS', valign: 'middle' });

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('wrote', OUT);
})();
