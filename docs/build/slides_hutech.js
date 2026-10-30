// Slide báo cáo theo template bài giảng HUTECH (4:3, thanh xanh 2A10B4, logo góc trái, Trebuchet MS / Arial)
// Nguyên tắc bố cục: mỗi slide lấp đầy khung 0.8..9.7 x 1.5..6.9; ít chữ, khối lớn; slide tính năng dùng
// cùng một khung 3 vùng: dải "Bài toán" → cột trái "Giải pháp" (SQL nền tối chữ to) → cột phải "Kết quả" (số lớn + ảnh)
const pptxgen = require('pptxgenjs');
const path = require('path');
const { applyTheme } = require('/root/.claude/skills/synced/91879b9e-0144-4212-bb51-3950dfa56628_22d3ddbc-74b0-4b5b-a461-e8a2fd2bb0c4/pptx/scripts/apply_theme.js');

const IMG = (f) => path.resolve(__dirname, '../img', f);
const OUT = path.resolve(__dirname, '../Slide_CSDL_Nhom6_PostgreSQL.pptx');

const BLUE = '2A10B4', YELLOW = 'FFD54A', GRAY = 'D6D6D6', LIGHT = 'EEF0FA', INK = '1A1A1A', DARK = '1E1B2E', MUTED = '555555';
const GREEN = '1E8E3E', RED = 'C62828', TEAL = '0B7285', ORANGE = 'E65100';
const THEME = {
  name: 'HUTECH', headFontFace: 'Trebuchet MS', bodyFontFace: 'Arial',
  colors: { dk1: INK, lt1: 'FFFFFF', dk2: BLUE, lt2: LIGHT, accent1: BLUE, accent2: 'FFC000', accent3: GREEN, accent4: RED, accent5: TEAL, accent6: MUTED, hlink: BLUE, folHlink: MUTED },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_4x3';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'Xây dựng hệ thống bán hàng trang sức với PostgreSQL';
pres.author = 'Nhóm 6';

// Vùng nội dung
const X0 = 0.8, W0 = 8.9, Y0 = 1.5, Y1 = 6.95;

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
const T = (slide, text, o) => slide.addText(text, { fontFace: 'Arial', color: INK, margin: 0, isTextBox: true, valign: 'top', ...o });
const bullets = (slide, items, x, y, w, h, fontSize = 18, color = INK) =>
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })),
    { x, y, w, h, fontFace: 'Arial', fontSize, color, valign: 'top', margin: 0, isTextBox: true, objectName: 'bullets' });
/** Khối SQL nền tối, chữ to, có nhãn file ở góc */
const codeBox = (slide, text, x, y, w, h, fontSize = 15, label = null) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: DARK }, line: { color: DARK }, rectRadius: 0.08, objectName: 'code-bg' });
  if (label) T(slide, label, { x: x + w - 2.6, y: y + h - 0.3, w: 2.5, h: 0.3, fontSize: 10, color: '9A96B8', align: 'right', fontFace: 'Courier New' });
  slide.addText(text.split('\n').map((l, i, a) => ({ text: l, options: { breakLine: i < a.length - 1 } })),
    { x: x + 0.18, y: y + 0.18, w: w - 0.36, h: h - 0.3, fontSize, fontFace: 'Courier New', color: 'F2F0FF', valign: 'top', margin: 0, isTextBox: true, objectName: 'code' });
};
/** Thẻ số lớn */
const stat = (slide, num, label, x, y, w, h = 1.5, color = BLUE, numSize = 36) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.08, objectName: 'stat-bg' });
  T(slide, num, { x, y: y + 0.1, w, h: h * 0.55, fontSize: numSize, bold: true, color, align: 'center', valign: 'middle', fontFace: 'Trebuchet MS', objectName: 'stat-num' });
  T(slide, label, { x: x + 0.12, y: y + h * 0.6, w: w - 0.24, h: h * 0.4 - 0.05, fontSize: 12, color: MUTED, align: 'center', objectName: 'stat-label' });
};
/** Dải "Bài toán" trên cùng của slide tính năng */
const problem = (slide, text) => {
  slide.addShape(pres.ShapeType.rect, { x: X0, y: Y0, w: W0, h: 0.72, fill: { color: 'FFF4E5' }, line: { color: 'FFF4E5' }, objectName: 'problem-bg' });
  T(slide, 'BÀI TOÁN', { x: X0 + 0.15, y: Y0 + 0.06, w: 1.3, h: 0.6, fontSize: 11, bold: true, color: ORANGE, valign: 'middle', charSpacing: 1 });
  T(slide, text, { x: X0 + 1.35, y: Y0 + 0.06, w: W0 - 1.5, h: 0.6, fontSize: 15, color: INK, valign: 'middle' });
};
/** Nhãn mục nhỏ in hoa */
const label = (slide, text, x, y, w, color = BLUE) => T(slide, text, { x, y, w, h: 0.3, fontSize: 11, bold: true, color, charSpacing: 1 });
const pill = (slide, n, text, x, y, w, h = 0.6, fs = 17) => {
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.12, shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, color: '000000', opacity: 0.22 }, objectName: 'pill' });
  slide.addShape(pres.ShapeType.ellipse, { x: x + 0.12, y: y + (h - 0.42) / 2, w: 0.42, h: 0.42, fill: { color: BLUE }, line: { color: BLUE }, objectName: 'pill-dot' });
  T(slide, String(n), { x: x + 0.12, y: y + (h - 0.42) / 2, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
  T(slide, text, { x: x + 0.68, y, w: w - 0.8, h, fontSize: fs, valign: 'middle' });
};
const img = (slide, file, x, y, w, h, frame = true) => {
  if (frame) slide.addShape(pres.ShapeType.rect, { x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08, fill: { color: 'FFFFFF' }, line: { color: GRAY, width: 1 }, shadow: { type: 'outer', blur: 4, offset: 2, angle: 45, color: '000000', opacity: 0.18 }, objectName: 'frame' });
  slide.addImage({ path: IMG(file), x, y, w, h, sizing: { type: 'cover', w, h }, objectName: file });
};
const table = (slide, header, rows, x, y, w, colW, fontSize = 14, rowH = 0.5) =>
  slide.addTable([
    header.map((h) => ({ text: h, options: { bold: true, fill: { color: GRAY }, align: 'center' } })),
    ...rows.map((r, i) => r.map((c) => (typeof c === 'string' ? { text: c, options: { fill: { color: i % 2 ? 'F2F2F2' : 'FFFFFF' } } } : { ...c, options: { ...c.options, fill: { color: i % 2 ? 'F2F2F2' : 'FFFFFF' } } }))),
  ], { x, y, w, colW, rowH, fontFace: 'Arial', fontSize, color: INK, border: { type: 'solid', color: '000000', pt: 0.75 }, valign: 'middle', margin: 0.07, objectName: 'table' });
const SECTIONS = ['Vì sao PostgreSQL', 'Kiến trúc hệ thống', 'Thiết kế CSDL', '6 tính năng nổi bật', 'Demo & benchmark', 'Kết luận'];
/** Slide nội dung; sec = 1..6 → vẽ thanh tiến trình 6 đoạn + tên phần ở góc phải trên */
const content = (title, sec) => {
  const s = pres.addSlide({ masterName: 'HUTECH', sectionTitle: sec ? `${sec}. ${SECTIONS[sec - 1]}` : 'Mở đầu' });
  s.addText(title, { placeholder: 'title' });
  if (sec) {
    const segW = 0.55, gap = 0.06, x0 = 9.9 - 6 * segW - 5 * gap;
    SECTIONS.forEach((_, i) => s.addShape(pres.ShapeType.rect, { x: x0 + i * (segW + gap), y: 0.1, w: segW, h: 0.09, fill: { color: i + 1 === sec ? BLUE : (i + 1 < sec ? 'B9B3E6' : 'E1E1E1') }, line: { color: 'FFFFFF', width: 0 }, objectName: 'sec-seg' }));
    T(s, `PHẦN ${sec}/6 · ${SECTIONS[sec - 1].toUpperCase()}`, { x: x0, y: 0.22, w: 6 * segW + 5 * gap, h: 0.25, fontSize: 10, bold: true, color: BLUE, align: 'right', charSpacing: 1, objectName: 'sec-label' });
  }
  return s;
};

// ====================================================================== 1. Bìa
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
T(s, [{ text: 'Phùng Anh Tuấn – 2541864024', options: { breakLine: true } }, { text: 'Võ Bùi Duy Thông – 2541864019' }], { x: 2.1, y: 5.4, w: 7.7, h: 0.9, fontSize: 18, color: 'FFFFFF', align: 'center' });
T(s, 'GVHD: TS. Lê Thị Ngọc Thảo   ·   Lớp 25SCT41   ·   Tháng 10/2026', { x: 2.1, y: 6.55, w: 7.7, h: 0.4, fontSize: 14, color: 'DDDDFF', align: 'center' });

// ====================================================================== 2. Nội dung
s = content('Nội dung', 0);
['Vì sao chọn PostgreSQL', 'Kiến trúc hệ thống', 'Thiết kế CSDL: lược đồ 8 bảng và các loại index', '6 tính năng nổi bật gắn với nghiệp vụ', 'Ứng dụng, demo và benchmark trên 1 triệu đơn hàng', 'Kết luận']
  .forEach((t, i) => pill(s, i + 1, t, 1.2, 1.65 + i * 0.86, 7.9, 0.66));

// ====================================================================== 3. Vì sao PostgreSQL
s = content('Vì sao chọn PostgreSQL?', 1);
stat(s, '#4', 'DB-Engines, sau Oracle,\nMySQL, SQL Server', X0, Y0, 2.1, 1.4);
stat(s, '+21,97', 'điểm nửa đầu 2026\ntăng mạnh nhất top 5', X0 + 2.27, Y0, 2.1, 1.4, GREEN);
stat(s, '4 lần', 'DBMS of the Year\n2017 · 2018 · 2020 · 2023', X0 + 4.54, Y0, 2.1, 1.4, TEAL);
stat(s, '100%', 'mã nguồn mở, không có\nbản Enterprise thu phí', X0 + 6.81, Y0, 2.09, 1.4, RED);
// hai cột: quan hệ vs đa mô hình
label(s, 'CSDL QUAN HỆ ĐẦY ĐỦ', X0, 3.15, 4.3);
bullets(s, ['Giao dịch ACID, MVCC: đọc không chặn ghi', 'Khoá ngoại, CHECK, UNIQUE, generated column', 'DDL nằm trong transaction → migration an toàn', 'Hàm PL/pgSQL, trigger: logic nằm sát dữ liệu'], X0, 3.5, 4.3, 2.6, 15);
label(s, '+ ĐA MÔ HÌNH TRONG CÙNG MỘT HỆ THỐNG', X0 + 4.6, 3.15, 4.3);
bullets(s, ['JSONB, mảng, full-text search, pgvector', '6 loại index: B-tree, Hash, GIN, GiST, SP-GiST, BRIN', 'Partition, materialized view, LISTEN/NOTIFY', 'Extension: pgvector, pg_trgm, unaccent, pg_stat_statements'], X0 + 4.6, 3.5, 4.3, 2.6, 15);
s.addShape(pres.ShapeType.rect, { x: X0, y: 6.2, w: W0, h: 0.7, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'punch-bg' });
T(s, 'Cách làm của nhóm 6: mỗi tính năng PostgreSQL gắn với 1 nghiệp vụ thật của cửa hàng trang sức và có số đo trên 1 triệu đơn hàng', { x: X0 + 0.2, y: 6.2, w: W0 - 0.4, h: 0.7, fontSize: 14, bold: true, color: BLUE, valign: 'middle' });

// ====================================================================== 4. Đặc thù → tính năng
s = content('6 đặc thù nghiệp vụ – 6 tính năng PostgreSQL', 1);
const map = [
  ['Mỗi loại trang sức có thuộc tính khác nhau (ni, carat, dài dây…)', 'JSONB + GIN index'],
  ['Khách gõ không dấu, sai chính tả vẫn phải tìm ra', 'Full-text search + unaccent + pg_trgm'],
  ['Gợi ý “sản phẩm giống” khi xem chi tiết', 'pgvector + HNSW'],
  ['Đơn hàng tăng mãi theo thời gian', 'Partitioning theo tháng + BRIN'],
  ['Tồn kho ít, 2 khách mua cùng lúc chiếc cuối', 'Transaction + SELECT … FOR UPDATE'],
  ['Dashboard nhanh, báo hết hàng tức thì', 'Materialized view + LISTEN/NOTIFY'],
];
map.forEach(([a, b], i) => {
  const y = Y0 + i * 0.9;
  s.addShape(pres.ShapeType.ellipse, { x: X0, y: y + 0.1, w: 0.55, h: 0.55, fill: { color: BLUE }, line: { color: BLUE }, objectName: 'n' });
  T(s, String(i + 1), { x: X0, y: y + 0.1, w: 0.55, h: 0.55, fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
  T(s, a, { x: X0 + 0.7, y, w: 4.5, h: 0.75, fontSize: 15, valign: 'middle' });
  T(s, '→', { x: X0 + 5.2, y, w: 0.4, h: 0.75, fontSize: 20, color: MUTED, align: 'center', valign: 'middle' });
  s.addShape(pres.ShapeType.roundRect, { x: X0 + 5.6, y: y + 0.08, w: 3.3, h: 0.6, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.08, objectName: 'f-bg' });
  T(s, b, { x: X0 + 5.7, y: y + 0.08, w: 3.1, h: 0.6, fontSize: 14, bold: true, color: BLUE, valign: 'middle' });
});

// ====================================================================== 5. Kiến trúc (vẽ bằng shape)
pres.addSection({ title: 'Thiết kế' });
s = content('Kiến trúc hệ thống', 2);
const box = (x, y, w, h, head, lines, c, fs = 11) => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: c, width: 1.5 }, rectRadius: 0.06, shadow: { type: 'outer', blur: 3, offset: 1.5, angle: 45, color: '000000', opacity: 0.15 }, objectName: 'box' });
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.42, fill: { color: c }, line: { color: c }, rectRadius: 0.06, objectName: 'box-h' });
  s.addShape(pres.ShapeType.rect, { x, y: y + 0.2, w, h: 0.22, fill: { color: c }, line: { color: c }, objectName: 'box-h2' });
  T(s, head, { x: x + 0.1, y, w: w - 0.2, h: 0.42, fontSize: 12.5, bold: true, color: 'FFFFFF', valign: 'middle', align: 'center' });
  if (lines.length) T(s, lines.map((l, i) => ({ text: l, options: { breakLine: i < lines.length - 1 } })), { x: x + 0.12, y: y + 0.48, w: w - 0.24, h: h - 0.52, fontSize: fs, color: INK, valign: 'top' });
};
const arrow = (x1, y1, x2, y2, lbl = null, dash = false, c = MUTED) => {
  const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: c, width: 1.5, endArrowType: 'triangle', dashType: dash ? 'dash' : 'solid' }, objectName: 'arrow' };
  if (x2 < x1) o.flipH = true; if (y2 < y1) o.flipV = true;
  s.addShape(pres.ShapeType.line, o);
  if (lbl) T(s, lbl, { x: Math.min(x1, x2) - 0.3, y: Math.min(y1, y2) - 0.26, w: Math.abs(x2 - x1) + 0.6, h: 0.24, fontSize: 9.5, color: c, align: 'center', italic: true });
};
const tag = (x, y, w, t) => T(s, t, { x, y, w, h: 0.22, fontSize: 9, color: MUTED, align: 'center' });
// Hàng chính
tag(0.8, 1.55, 1.7, 'TRÌNH DUYỆT');
box(0.8, 1.8, 1.7, 1.0, 'Khách hàng', ['/  trang bán hàng', 'tìm kiếm · giỏ hàng'], ORANGE, 10);
box(0.8, 3.05, 1.7, 1.0, 'Quản trị', ['/admin  (JWT)', 'dashboard · kho · monitor'], ORANGE, 10);
tag(3.0, 1.55, 1.95, 'CONTAINER  web  :3000');
box(3.0, 1.8, 1.95, 2.25, 'Next.js 15', ['• SSR trang bán hàng', '• Client components', '   cho trang quản trị', '• EventSource nhận SSE'], GREEN, 10);
tag(5.35, 1.55, 1.95, 'CONTAINER  api  :4000');
box(5.35, 1.8, 1.95, 2.25, 'Node.js + Fastify', ['• SQL thuần: pg', '   pool.query($1, $2)', '• migrate · seed · bench', '• LISTEN low_stock,', '   new_order → SSE'], TEAL, 10);
tag(7.7, 1.55, 2.0, 'CONTAINER  db  :5432');
box(7.7, 1.8, 2.0, 3.1, 'PostgreSQL 16', ['• 8 bảng, orders chia 37', '   partition theo tháng', '• JSONB · tsvector · vector', '• place_order() · trigger', '• matview · NOTIFY', '', 'Extension: pgvector,', 'pg_trgm, unaccent,', 'pg_stat_statements'], BLUE, 10);
arrow(2.5, 2.3, 3.0, 2.3, 'HTTP');
arrow(2.5, 3.55, 3.0, 3.55, 'HTTP');
arrow(4.95, 2.4, 5.35, 2.4, 'REST');
arrow(7.3, 2.4, 7.7, 2.4, 'SQL');
arrow(7.7, 3.4, 7.3, 3.4, 'NOTIFY', true, RED);
// SSE: api → admin (đi vòng dưới)
s.addShape(pres.ShapeType.line, { x: 6.32, y: 4.05, w: 0, h: 0.45, line: { color: RED, width: 1.5, dashType: 'dash' }, objectName: 'sse1' });
s.addShape(pres.ShapeType.line, { x: 1.65, y: 4.5, w: 4.67, h: 0, line: { color: RED, width: 1.5, dashType: 'dash' }, objectName: 'sse2' });
s.addShape(pres.ShapeType.line, { x: 1.65, y: 4.05, w: 0, h: 0.45, line: { color: RED, width: 1.5, dashType: 'dash', endArrowType: 'triangle' }, flipV: true, objectName: 'sse3' });
T(s, 'SSE – cảnh báo sắp hết hàng tới trình duyệt admin < 0,1 s, không F5', { x: 1.9, y: 4.52, w: 4.4, h: 0.24, fontSize: 9.5, italic: true, color: RED, align: 'center' });
// Hàng công cụ (kết nối thẳng PostgreSQL)
T(s, 'CÔNG CỤ DEMO & ĐO', { x: 0.8, y: 5.1, w: 1.4, h: 0.22, fontSize: 8.5, color: MUTED });
box(0.8, 5.5, 2.75, 1.3, 'DBeaver / psql', ['db/demo/demo_queries.sql', '8 mục demo, EXPLAIN dạng hình'], MUTED, 10);
box(3.85, 5.5, 2.75, 1.3, 'npm run bench · pgbench', ['12 kịch bản có/không index', '50 client mua cùng lúc'], MUTED, 10);
box(6.9, 5.5, 2.8, 1.3, 'Monitor & Benchmark', ['/admin/monitor: EXPLAIN ANALYZE,', 'pg_stat_statements, index size'], MUTED, 10);
s.addShape(pres.ShapeType.line, { x: 2.17, y: 5.25, w: 6.53, h: 0, line: { color: MUTED, width: 1.2 }, objectName: 'bus' });
[2.17, 5.22].forEach((x) => s.addShape(pres.ShapeType.line, { x, y: 5.25, w: 0, h: 0.25, line: { color: MUTED, width: 1.2 }, objectName: 'bus-v' }));
s.addShape(pres.ShapeType.line, { x: 8.7, y: 4.9, w: 0, h: 0.35, line: { color: MUTED, width: 1.2, endArrowType: 'triangle' }, flipV: true, objectName: 'bus-up' });
T(s, 'kết nối thẳng PostgreSQL :5432', { x: 6.0, y: 5.0, w: 2.6, h: 0.22, fontSize: 9, italic: true, color: MUTED, align: 'right' });

// ====================================================================== 6. ERD (vẽ bằng shape)
s = content('Thiết kế CSDL: 8 bảng', 3);
const RH = 0.26;
/** Thẻ bảng: rows = [text] hoặc [text, true] (dòng nổi bật) */
const tbl = (x, y, w, name, rows, c, sub = null) => {
  const h = 0.32 + rows.length * RH;
  s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: c, width: 1.2 }, shadow: { type: 'outer', blur: 3, offset: 1.5, angle: 45, color: '000000', opacity: 0.15 }, objectName: 'tbl' });
  s.addShape(pres.ShapeType.rect, { x, y, w, h: 0.32, fill: { color: c }, line: { color: c }, objectName: 'tbl-h' });
  T(s, [{ text: name, options: { bold: true } }, ...(sub ? [{ text: '  ' + sub, options: { fontSize: 8.5 } }] : [])], { x: x + 0.08, y, w: w - 0.16, h: 0.32, fontSize: 11.5, color: 'FFFFFF', valign: 'middle' });
  rows.forEach((r, i) => {
    const [t, hi] = Array.isArray(r) ? r : [r, false];
    if (hi) s.addShape(pres.ShapeType.rect, { x: x + 0.02, y: y + 0.32 + i * RH, w: w - 0.04, h: RH, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'tbl-hi' });
    T(s, t, { x: x + 0.08, y: y + 0.32 + i * RH, w: w - 0.16, h: RH, fontSize: 10, color: hi ? BLUE : INK, bold: hi, valign: 'middle', fontFace: 'Arial' });
  });
  return h;
};
const rel = (x1, y1, x2, y2, lbl = '1 : n') => {
  s.addShape(pres.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: MUTED, width: 1.2 }, flipH: x2 < x1, flipV: y2 < y1, objectName: 'rel' });
  s.addShape(pres.ShapeType.ellipse, { x: x1 - 0.05, y: y1 - 0.05, w: 0.1, h: 0.1, fill: { color: MUTED }, line: { color: MUTED }, objectName: 'rel-1' });
  if (x1 === x2) T(s, lbl, { x: x1 + 0.06, y: (y1 + y2) / 2 - 0.1, w: 0.5, h: 0.2, fontSize: 8, color: MUTED });
  else T(s, lbl, { x: (x1 + x2) / 2 - 0.35, y: (y1 + y2) / 2 - 0.24, w: 0.7, h: 0.2, fontSize: 8, color: MUTED, align: 'center' });
};
const GOLD = 'B8902E';
// cột trái
tbl(0.8, 1.55, 1.95, 'categories', ['id  PK', 'slug  UQ', 'name', 'parent_id  FK (cha–con)'], GOLD);
tbl(0.8, 3.55, 1.95, 'product_images', ['id  PK', 'product_id  FK', 'url', 'sort_order'], GOLD);
tbl(0.8, 5.3, 1.95, 'admins', ['id  PK', 'username  UQ', 'password_hash'], MUTED);
// cột giữa: products + stock_movements
tbl(3.1, 1.55, 2.5, 'products', ['id  PK', 'sku  UQ  ·  slug  UQ', 'name  ·  description', 'category_id  FK', 'price  ·  stock  CHECK ≥ 0', ['attributes   JSONB  + GIN', true], ['embedding   vector(256)  + HNSW', true], ['search_vec   tsvector  (generated)', true], 'image_url  ·  status', 'created_at  ·  updated_at'], BLUE);
tbl(3.1, 4.75, 2.5, 'stock_movements', ['id  PK', 'product_id  FK', 'delta  ·  reason  ·  ref_id', 'created_at'], GREEN);
// cột phải: customers, orders, order_items
tbl(7.6, 1.55, 2.1, 'customers', ['id  PK', 'full_name', 'phone  UQ', 'email  ·  address'], TEAL);
tbl(7.6, 3.3, 2.1, 'orders', [['id · created_at   PK', true], ['PARTITION theo tháng (37)', true], 'customer_id  FK', 'status  CHECK', 'subtotal  ·  shipping_fee', ['total  (generated)', true], 'note'], TEAL);
tbl(5.8, 3.6, 1.75, 'order_items', ['id  PK', 'order_id · created_at  FK', 'product_id  FK', 'qty  ·  unit_price', ['line_total  (generated)', true]], TEAL);
// quan hệ
rel(2.75, 2.1, 3.1, 2.1);                 // categories → products
rel(3.1, 4.1, 2.75, 4.1);                 // products → product_images
rel(4.35, 4.47, 4.35, 4.75);              // products → stock_movements
rel(5.6, 4.2, 5.8, 4.2);                  // products → order_items
rel(8.65, 2.91, 8.65, 3.3);               // customers → orders
rel(7.6, 4.6, 7.55, 4.6);                 // orders → order_items
// ghi chú dưới
s.addShape(pres.ShapeType.rect, { x: 5.8, y: 5.7, w: 3.9, h: 1.15, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'erd-note' });
T(s, [
  { text: 'Ngoài 8 bảng: ', options: { bold: true, color: BLUE } }, { text: '37 partition orders_YYYY_MM · 2 materialized view mv_sales_daily, mv_top_products · hàm place_order(), cancel_order() · trigger notify_low_stock, notify_new_order', options: { breakLine: true } },
  { text: 'Nền xanh', options: { bold: true, color: BLUE } }, { text: ' = cột dùng tính năng PostgreSQL nổi bật' },
], { x: 5.9, y: 5.72, w: 3.7, h: 1.1, fontSize: 9.5, color: INK, fontFace: 'Arial', margin: 0, isTextBox: true, valign: 'middle' });

// ====================================================================== 13. Index khác
s = content('Thiết kế CSDL: các loại index đặc biệt', 3);
table(s, ['Loại', 'Trong hệ thống', 'Đo trên 1 triệu đơn'], [
  ['Partial index', { text: 'orders (created_at)\nWHERE status IN (pending, confirmed)', options: { fontFace: 'Courier New', fontSize: 12 } }, '0,2 ms so với 98 ms (480×)\nindex chỉ 17 MB'],
  ['Covering index (INCLUDE)', { text: 'orders (customer_id, created_at)\nINCLUDE (id, status, total)', options: { fontFace: 'Courier New', fontSize: 12 } }, 'Index Only Scan, Heap Fetches = 0\n0,2 ms so với 52 ms (250×)'],
  ['Expression index', { text: 'customers (lower(email))', options: { fontFace: 'Courier New', fontSize: 12 } }, 'Tìm email không phân biệt hoa thường'],
  ['Generated column', { text: 'total = subtotal + shipping_fee\nsearch_vec = to_tsvector(...)', options: { fontFace: 'Courier New', fontSize: 12 } }, 'CSDL tự tính, app không ghi sai được'],
], X0, Y0, W0, [2.3, 3.9, 2.7], 13, [0.5, 0.9, 0.9, 0.8, 0.9]);
s.addShape(pres.ShapeType.rect, { x: X0, y: 5.85, w: W0, h: 1.0, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'note-bg' });
T(s, 'Mỗi index gắn với đúng 1 truy vấn của ứng dụng. Theo dõi lượt dùng bằng pg_stat_user_indexes: index có idx_scan = 0 lâu ngày là ứng viên để xoá.', { x: X0 + 0.2, y: 5.85, w: W0 - 0.4, h: 1.0, fontSize: 14, color: INK, valign: 'middle' });

// ====================================================================== 7–12. Sáu tính năng: khung 3 vùng
pres.addSection({ title: '6 tính năng' });
const feature = (n, title) => content(`${n}. ${title}`, 4);
const LX = X0, LW = 5.3, RX = X0 + 5.5, RW = 3.4, TY = Y0 + 0.9;   // cột trái/phải dưới dải bài toán

s = feature(1, 'JSONB – thuộc tính sản phẩm linh hoạt');
problem(s, 'Nhẫn có ni, carat, nước màu; dây chuyền có chiều dài; vòng có đường kính… Thêm cột → hàng chục cột NULL; bảng EAV → JOIN nhiều lần.');
label(s, 'GIẢI PHÁP', LX, TY, 3);
codeBox(s, `attributes JSONB NOT NULL DEFAULT '{}'

CREATE INDEX idx_products_attributes
  ON products USING GIN
  (attributes jsonb_path_ops);

-- 1 câu SQL cho mọi tổ hợp bộ lọc
SELECT * FROM products
WHERE attributes @> '{"metal":"Vàng 18K",
                      "stone":"Kim cương"}';`, LX, TY + 0.35, LW, 3.1, 13, '002 · 004_indexes.sql');
bullets(s, ['Thêm loại trang sức mới: không ALTER TABLE', 'Bộ lọc chất liệu / đá trên web sinh từ JSONB'], LX, TY + 3.6, LW, 0.9, 14);
label(s, 'KẾT QUẢ', RX, TY, 3);
stat(s, '34×', 'nhanh hơn quét tuần tự\n0,06 ms so với 2,1 ms', RX, TY + 0.35, RW, 1.35);
img(s, 'slide-jsonb-admin.jpg', RX, TY + 1.9, RW, 2.6);

s = feature(2, 'Full-text search tiếng Việt');
problem(s, 'Khách gõ “nhan kim cuong 18k” (không dấu) hoặc “nhan kim cuog solitare” (sai chính tả) vẫn phải tìm ra đúng sản phẩm. LIKE không có index, không xếp hạng.');
label(s, 'GIẢI PHÁP: UNACCENT + TSVECTOR + PG_TRGM', LX, TY, 5);
codeBox(s, `search_vec TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('simple', vi_unaccent(name))
) STORED;

CREATE INDEX ... USING GIN (search_vec);
CREATE INDEX ... USING GIN
  (vi_unaccent(name) gin_trgm_ops);

-- Tầng 1: full-text, xếp hạng ts_rank
WHERE search_vec @@
      plainto_tsquery(vi_unaccent($1))
-- Tầng 2: sai chính tả → trigram
WHERE vi_unaccent(name) % 'nhan kim cuog'`, LX, TY + 0.35, LW, 3.4, 13, '001 · 002 · search.js');
T(s, 'Không cần Elasticsearch', { x: LX, y: TY + 3.85, w: LW, h: 0.5, fontSize: 18, bold: true, color: BLUE });
label(s, 'KẾT QUẢ', RX, TY, 3);
stat(s, '9,6×', 'FTS có GIN so với quét tuần tự', RX, TY + 0.35, RW, 1.15, BLUE, 32);
img(s, 'slide-trigram.jpg', RX, TY + 1.7, RW, 1.7);
T(s, '“nhan kim cuog solitare” → Nhẫn kim cương vàng 18K Solitaire (similarity 0,44)', { x: RX, y: TY + 3.5, w: RW, h: 0.9, fontSize: 12, italic: true, color: MUTED });

s = feature(3, 'pgvector – gợi ý sản phẩm tương tự');
problem(s, 'Khách xem nhẫn kim cương vàng trắng → gợi ý sản phẩm “giống”: cùng loại, cùng chất liệu, cùng đá. Quy tắc “cùng danh mục” quá thô.');
label(s, 'GIẢI PHÁP: EMBEDDING 256 CHIỀU + INDEX HNSW', LX, TY, 5);
codeBox(s, `embedding vector(256)

CREATE INDEX idx_products_embedding
  ON products USING hnsw
  (embedding vector_cosine_ops);

-- 8 sản phẩm gần nhất (<=> = cosine)
SELECT p.name,
       1 - (p.embedding <=> me.embedding) sim
FROM products p,
     (SELECT embedding FROM products
       WHERE slug = $1) me
ORDER BY p.embedding <=> me.embedding
LIMIT 8;`, LX, TY + 0.35, LW, 3.45, 13, '002 · 004 · catalog.js');
bullets(s, ['Embedding demo = feature hashing từ tên, danh mục, JSONB (không cần API ngoài); thay bằng OpenAI / CLIP chỉ đổi 1 hàm'], LX, TY + 3.9, LW, 0.65, 13);
label(s, 'KẾT QUẢ', RX, TY, 3);
stat(s, '7,4×', 'HNSW 0,23 ms so với 1,7 ms\ntính toàn bộ 3.033 vector', RX, TY + 0.35, RW, 1.35, BLUE, 32);
img(s, 'slide-similar.jpg', RX, TY + 1.9, RW, 2.6);

s = feature(4, 'Partitioning theo tháng + BRIN');
problem(s, 'Bảng đơn hàng chỉ tăng: sau vài năm hàng triệu dòng, nhưng nghiệp vụ hằng ngày chỉ chạm đơn gần đây. Index lớn, VACUUM chậm, xoá đơn cũ phải DELETE hàng loạt.');
label(s, 'GIẢI PHÁP', LX, TY, 3);
codeBox(s, `CREATE TABLE orders ( ...,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_10
  PARTITION OF orders
  FOR VALUES FROM ('2026-10-01')
               TO ('2026-11-01');

CREATE INDEX ... USING BRIN (created_at);`, LX, TY + 0.35, LW, 2.8, 13, '003 · 004_indexes.sql');
img(s, 'slide-bench-partition.jpg', LX, TY + 3.3, LW, 1.25);
label(s, 'KẾT QUẢ TRÊN 1 TRIỆU ĐƠN', RX, TY, 3.4);
stat(s, '1 / 37', 'partition được quét nhờ pruning\n3,3 ms so với 66 ms (20×)', RX, TY + 0.35, RW, 1.35, RED, 32);
stat(s, '888 kB', 'BRIN so với 23 MB B-tree\ncùng cột created_at (26×)', RX, TY + 1.85, RW, 1.35, TEAL, 32);
bullets(s, ['Lưu trữ đơn cũ = DETACH 1 partition', 'Tháng mới: ensure_orders_partition()', 'VACUUM / index chỉ trên partition nhỏ'], RX, TY + 3.4, RW, 1.1, 12);

s = feature(5, 'Transaction + FOR UPDATE – chống bán quá kho');
problem(s, 'Nhẫn Solitaire còn đúng 1 chiếc, 2 khách bấm “Đặt hàng” cùng lúc. Nếu app chỉ SELECT stock rồi UPDATE, cả hai cùng thấy stock = 1 → bán 2 chiếc.');
label(s, 'GIẢI PHÁP: 1 HÀM PL/PGSQL = 1 TRANSACTION', LX, TY, 5);
codeBox(s, `FOR r IN
  SELECT p.id, p.stock, i.qty
  FROM jsonb_to_recordset(p_items) i
  JOIN products p ON p.id = i.product_id
  ORDER BY p.id   -- cùng thứ tự, không deadlock
  FOR UPDATE OF p -- giao dịch 2 phải CHỜ ở đây
LOOP
  IF r.stock < r.qty THEN
    RAISE EXCEPTION 'OUT_OF_STOCK: %', r.stock;
  END IF;
END LOOP;
-- INSERT orders, order_items; UPDATE stock
-- CHECK (stock >= 0) là lớp bảo vệ cuối`, LX, TY + 0.35, LW, 3.4, 12, '005_order_transaction.sql');
s.addShape(pres.ShapeType.rect, { x: LX, y: TY + 3.9, w: LW, h: 0.65, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'flow-bg' });
T(s, 'Giao dịch 2 chờ giao dịch 1 COMMIT  →  đọc stock đã trừ  →  OUT_OF_STOCK  →  không bao giờ bán quá kho', { x: LX + 0.15, y: TY + 3.9, w: LW - 0.3, h: 0.65, fontSize: 12.5, bold: true, color: BLUE, valign: 'middle' });
label(s, 'KẾT QUẢ (PGBENCH)', RX, TY, 3.4);
stat(s, '5 / 50', '50 client cùng mua khi kho = 5\nđúng 5 đơn, 45 bị OUT_OF_STOCK', RX, TY + 0.35, RW, 1.35, GREEN, 32);
stat(s, '1.090', 'đơn / giây, 30 client đồng thời\ntrên CSDL 1 triệu đơn', RX, TY + 1.85, RW, 1.35, BLUE, 32);
bullets(s, ['API chỉ gọi SELECT place_order($1,$2)', 'Huỷ đơn: cancel_order() hoàn kho cùng transaction', 'Mọi thay đổi kho ghi vào stock_movements'], RX, TY + 3.4, RW, 1.1, 12);

s = feature(6, 'Materialized view + LISTEN/NOTIFY');
problem(s, 'Dashboard cần doanh thu 30 ngày, top sản phẩm… tính trên 1,5 triệu dòng chi tiết mỗi lần mở là lãng phí. Admin muốn biết NGAY khi hàng sắp hết, không F5.');
label(s, 'GIẢI PHÁP', LX, TY, 3);
codeBox(s, `CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT created_at::date AS day,
       count(*), sum(total) AS revenue
FROM orders WHERE status <> 'cancelled'
GROUP BY 1;
REFRESH MATERIALIZED VIEW CONCURRENTLY
  mv_sales_daily;   -- không chặn đọc

-- Trigger: stock < 3 → pg_notify('low_stock')
-- Node.js: LISTEN low_stock → SSE → admin`, LX, TY + 0.35, LW, 2.8, 12, '006 · 005 · events.js');
img(s, 'slide-dashboard.jpg', LX, TY + 3.3, LW, 1.25);
label(s, 'KẾT QUẢ', RX, TY, 3);
stat(s, '1.000×', 'doanh thu 30 ngày: 0,018 ms\nso với 19 ms tính trực tiếp', RX, TY + 0.35, RW, 1.35, TEAL, 32);
stat(s, '< 0,1 s', 'cảnh báo tới admin\nkhông F5, không Redis', RX, TY + 1.85, RW, 1.35, RED, 32);
img(s, 'slide-notify.jpg', RX, TY + 3.4, RW, 1.15);

// ====================================================================== 14. Ứng dụng
pres.addSection({ title: 'Ứng dụng & kết quả' });
s = content('Ứng dụng: trang bán hàng và trang quản trị', 5);
img(s, 'slide-home.jpg', X0, Y0, 4.38, 2.3);
img(s, 'slide-list.jpg', X0 + 4.52, Y0, 4.38, 2.3);
img(s, 'slide-dashboard.jpg', X0, Y0 + 2.5, 4.38, 2.3);
img(s, 'slide-monitor.jpg', X0 + 4.52, Y0 + 2.5, 4.38, 2.3);
T(s, 'Trang chủ  ·  Lọc theo JSONB  ·  Dashboard (matview + NOTIFY)  ·  Monitor & Benchmark (EXPLAIN có/không index)', { x: X0, y: 6.45, w: W0, h: 0.4, fontSize: 13, color: MUTED, align: 'center' });

// ====================================================================== 15. Demo DBeaver
s = content('Demo trực tiếp bằng DBeaver', 5);
[
  'JSONB: lọc attributes @> {metal, stone} → GIN index',
  'Full-text “nhan kim cuong 18k” · trigram “nhan kim cuog solitare”',
  'pgvector: 8 sản phẩm giống nhẫn NK-001 (ORDER BY embedding <=> …)',
  'Partition: EXPLAIN chỉ quét 1/37 partition · BRIN 888 kB vs B-tree 23 MB',
  'place_order() 2 lần trên chiếc cuối → lần 2 báo OUT_OF_STOCK',
  'Matview 0,02 ms vs JOIN 1,5 triệu dòng 1,1 s · UPDATE stock → NOTIFY',
].forEach((t, i) => pill(s, i + 1, t, X0, Y0 + i * 0.72, W0, 0.6, 15));
s.addShape(pres.ShapeType.rect, { x: X0, y: 5.95, w: W0, h: 0.95, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'conn-bg' });
T(s, [
  { text: 'Kết nối: ', options: { bold: true } }, { text: 'localhost:5432 · db jewelry · postgres / postgres  —  mở db/demo/demo_queries.sql, chọn khối lệnh, Cmd+Enter', options: { breakLine: true } },
  { text: 'Web: ', options: { bold: true } }, { text: 'localhost:3000  ·  Admin → Monitor & Benchmark chạy EXPLAIN có/không index ngay trên giao diện' },
], { x: X0 + 0.2, y: 5.95, w: W0 - 0.4, h: 0.95, fontSize: 13, color: INK, valign: 'middle', fontFace: 'Arial', margin: 0, isTextBox: true });

// ====================================================================== 16. Benchmark
s = content('Benchmark: có index nhanh hơn bao nhiêu?', 5);
// Biểu đồ vẽ bằng shape (hiển thị giống nhau trên PowerPoint / Keynote / PDF), thang log
label(s, 'SỐ LẦN NHANH HƠN SO VỚI KHÔNG INDEX (1 TRIỆU ĐƠN, TRUNG VỊ 5 LẦN)', X0, Y0, W0);
const rows = [
  ['Materialized view', 1077, '0,018 ms vs 19 ms', TEAL],
  ['Partial index', 484, '0,2 ms vs 98 ms', BLUE],
  ['Covering index', 251, '0,2 ms vs 52 ms', BLUE],
  ['JSONB @> (GIN)', 34, '0,06 ms vs 2,1 ms', BLUE],
  ['Partition pruning', 20, '3,3 ms vs 66 ms', BLUE],
  ['Full-text (GIN)', 9.6, '0,22 ms vs 2,1 ms', BLUE],
  ['pgvector HNSW', 7.4, '0,23 ms vs 1,7 ms', BLUE],
  ['Trigram', 2.6, '0,8 ms vs 2,1 ms', BLUE],
];
const BX = X0 + 1.9, BW = 3.3, ROW = 0.52, maxLog = Math.log10(1077);
rows.forEach(([name, v, note, c], i) => {
  const y = Y0 + 0.4 + i * ROW;
  T(s, name, { x: X0, y, w: 1.85, h: ROW, fontSize: 13, align: 'right', valign: 'middle' });
  const bw = Math.max(0.35, (Math.log10(v) / maxLog) * BW);
  s.addShape(pres.ShapeType.rect, { x: BX, y: y + 0.08, w: bw, h: ROW - 0.16, fill: { color: c }, line: { color: c }, objectName: 'bar' });
  T(s, String(v).replace('.', ',') + '×', { x: BX + bw + 0.08, y, w: 1.0, h: ROW, fontSize: 14, bold: true, color: c, valign: 'middle' });
  T(s, note, { x: X0 + 6.3, y, w: 1.4, h: ROW, fontSize: 10.5, color: MUTED, valign: 'middle' });
});
// thước log
[1, 10, 100, 1000].forEach((v) => {
  const x = BX + (Math.log10(v) / maxLog) * BW;
  s.addShape(pres.ShapeType.line, { x, y: Y0 + 0.4, w: 0, h: ROW * 8, line: { color: 'DDDDDD', width: 0.75, dashType: 'dash' }, objectName: 'grid' });
  T(s, v + '×', { x: x - 0.3, y: Y0 + 0.4 + ROW * 8, w: 0.6, h: 0.25, fontSize: 9, color: MUTED, align: 'center' });
});
// cột phải
const RX2 = X0 + 7.75, RW2 = 1.15;
stat(s, '1 tr', 'đơn hàng\n37 partition', RX2, Y0 + 0.4, RW2, 1.3, GREEN, 26);
stat(s, '1.090', 'đơn / giây\n30 client', RX2, Y0 + 1.8, RW2, 1.3, TEAL, 24);
stat(s, '5 / 50', 'không bán\nquá kho', RX2, Y0 + 3.2, RW2, 1.3, RED, 24);
s.addShape(pres.ShapeType.rect, { x: X0, y: Y0 + 4.95, w: W0, h: 0.5, fill: { color: LIGHT }, line: { color: LIGHT }, objectName: 'tool-bg' });
T(s, [
  { text: 'Công cụ đo  npm run bench', options: { bold: true, color: BLUE } },
  { text: '  —  12 kịch bản có/không index × 5 lần lấy trung vị, tắt index bằng SET LOCAL enable_… = off, kết quả ghi vào bench-report.md' },
], { x: X0 + 0.15, y: Y0 + 4.95, w: W0 - 0.3, h: 0.5, fontSize: 11.5, color: INK, fontFace: 'Arial', margin: 0, isTextBox: true, valign: 'middle' });

// ====================================================================== 17. Kết luận
pres.addSection({ title: 'Kết luận' });
s = content('Kết luận', 6);
const concl = [
  ['Một hệ thống thay nhiều hệ thống', 'PostgreSQL = CSDL quan hệ + đa mô hình: thay cho search engine, cache, hàng đợi và vector DB trong phạm vi cửa hàng.', BLUE],
  ['6 tính năng × 6 nghiệp vụ, đều có số đo', 'Trên 1 triệu đơn: nhanh hơn 2,6× – 1.000×; 50 client đồng thời không bán quá kho.', GREEN],
  ['Hạn chế', 'Embedding feature hashing; chưa có từ điển tiếng Việt; chưa tinh chỉnh tham số PostgreSQL.', ORANGE],
  ['Hướng phát triển', 'Embedding CLIP theo ảnh; pg_cron tự tạo partition & refresh; replication đọc/ghi tách biệt.', TEAL],
];
concl.forEach(([h, d, c], i) => {
  const x = X0 + (i % 2) * 4.55, y = Y0 + Math.floor(i / 2) * 2.3;
  s.addShape(pres.ShapeType.roundRect, { x, y, w: 4.35, h: 2.1, fill: { color: 'FFFFFF' }, line: { color: c, width: 1.5 }, rectRadius: 0.08, objectName: 'c' });
  s.addShape(pres.ShapeType.rect, { x, y, w: 0.14, h: 2.1, fill: { color: c }, line: { color: c }, objectName: 'c-bar' });
  T(s, h, { x: x + 0.3, y: y + 0.15, w: 3.95, h: 0.5, fontSize: 16, bold: true, color: c });
  T(s, d, { x: x + 0.3, y: y + 0.7, w: 3.95, h: 1.3, fontSize: 14, color: INK });
});
T(s, 'Cảm ơn cô và các bạn đã lắng nghe!', { x: X0, y: 6.2, w: W0, h: 0.7, fontSize: 24, bold: true, color: BLUE, align: 'center', fontFace: 'Trebuchet MS', valign: 'middle' });

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('wrote', OUT);
})();
