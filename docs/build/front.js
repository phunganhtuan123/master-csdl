// Trang bìa, trang phụ bìa, lời cảm ơn/nhận xét, mục lục, danh mục hình/bảng/viết tắt, mở đầu
const { Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const H = require('./helpers');
const { P, RP, H1, H2, bullets, numbered, pageBreak, center, run, cm, LINE, CONTENT_W } = H;
const { Table: _T } = require('docx');

const INFO = {
  truong: 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP. HỒ CHÍ MINH',
  vien: 'VIỆN ĐÀO TẠO SAU ĐẠI HỌC',
  mon: 'CƠ SỞ DỮ LIỆU',
  detai: 'XÂY DỰNG HỆ THỐNG BÁN HÀNG TRANG SỨC\nVỚI POSTGRESQL',
  nhom: 'Nhóm 6',
  tv: [['Phùng Anh Tuấn', '2541864024'], ['Võ Bùi Duy Thông', '2541864019']],
  gv: 'TS. Lê Thị Ngọc Thảo',
  lop: '25SCT41',
  noi: 'Thành phố Hồ Chí Minh, tháng 10 năm 2026',
};

function coverPage() {
  const fs = require('fs');
  const { ImageRun } = require('docx');
  const logo = fs.readFileSync(require('path').resolve(__dirname, '../img/tpl/hutech-logo-wide.png'));
  const out = [];
  out.push(center('BỘ GIÁO DỤC VÀ ĐÀO TẠO', { bold: true, size: 26, line: 276 }));
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276, lineRule: 'auto', after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 4 } },
    indent: { left: cm(1.5), right: cm(1.5) },
    children: [run(INFO.truong, { bold: true, size: 26 })] }));
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 },
    children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 300, height: 96 } })] }));
  out.push(center('MÔN HỌC: ' + INFO.mon, { bold: true, size: 26, after: 60 }));
  out.push(center('TIỂU LUẬN CUỐI KỲ', { bold: true, size: 28, color: H.BLUE, after: 360 }));
  out.push(center('ĐỀ TÀI', { size: 24, after: 60 }));
  for (const line of INFO.detai.split('\n')) out.push(center(line, { bold: true, size: 32, color: H.NAVY, line: 300 }));
  out.push(center('', { after: 600 }));
  const rows = [
    ['Giảng viên hướng dẫn', INFO.gv],
    ...INFO.tv.map(([n, m], i) => [i === 0 ? 'Học viên thực hiện' : '', `${n} - ${m}`]),
    ['Nhóm', INFO.nhom],
    ['Mã lớp', INFO.lop],
  ];
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const t = new Table({
    width: { size: cm(14), type: WidthType.DXA }, columnWidths: [cm(5.5), cm(8.5)], alignment: AlignmentType.CENTER,
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: rows.map(([a, b]) => new TableRow({ children: [
      new TableCell({ width: { size: cm(5.5), type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, children: [new Paragraph({ spacing: { line: 320, lineRule: 'auto' }, children: [run(a, { bold: true, size: 24 })] })] }),
      new TableCell({ width: { size: cm(8.5), type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, children: [new Paragraph({ spacing: { line: 320, lineRule: 'auto' }, children: [run(b, { size: 24 })] })] }),
    ] })),
  });
  out.push(t);
  out.push(center('', { after: 900 }));
  out.push(center(INFO.noi, { size: 24 }));
  return out;
}

function reviewPage() {
  return [
    center('NHẬN XÉT CỦA GIẢNG VIÊN', { bold: true, size: 28, color: H.BLUE, after: 360 }),
    ...Array.from({ length: 18 }, () => new Paragraph({ spacing: { line: 480, lineRule: 'auto' }, alignment: AlignmentType.LEFT,
      children: [run('.'.repeat(132), { size: 22, color: '777777' })] })),
  ];
}

const TERMS = [
  ['CSDL', 'Cơ sở dữ liệu', 'Tập hợp dữ liệu được tổ chức để lưu trữ, truy vấn và cập nhật.'],
  ['HQTCSDL / DBMS', 'Database Management System', 'Hệ quản trị cơ sở dữ liệu; đề tài sử dụng PostgreSQL 16.'],
  ['ERD', 'Entity Relationship Diagram', 'Sơ đồ biểu diễn thực thể, khoá và quan hệ giữa các bảng.'],
  ['PK / FK / UQ', 'Primary / Foreign Key, Unique', 'Khoá chính, khoá ngoại, ràng buộc duy nhất.'],
  ['JSONB', 'JSON Binary', 'Kiểu dữ liệu JSON nhị phân của PostgreSQL, đánh được index GIN; dùng cho thuộc tính sản phẩm.'],
  ['GIN', 'Generalized Inverted Index', 'Chỉ mục đảo ngược cho JSONB, tsvector, trigram.'],
  ['BRIN', 'Block Range Index', 'Chỉ mục theo khoảng khối, rất nhỏ, cho cột thời gian của bảng lớn.'],
  ['HNSW', 'Hierarchical Navigable Small World', 'Thuật toán index tìm láng giềng gần nhất của pgvector.'],
  ['FTS', 'Full-Text Search', 'Tìm kiếm toàn văn bằng tsvector/tsquery.'],
  ['Partition', 'Table partitioning', 'Chia bảng đơn hàng thành các bảng con theo tháng.'],
  ['Materialized view', 'Khung nhìn vật lý', 'Kết quả truy vấn lưu sẵn thành bảng, làm mới bằng REFRESH.'],
  ['MVCC / ACID', 'Multi-Version Concurrency Control', 'Cơ chế điều khiển đồng thời và bốn tính chất của giao dịch.'],
  ['LISTEN / NOTIFY', 'Pub/sub tích hợp', 'Cơ chế thông báo sự kiện của PostgreSQL; đẩy cảnh báo tới trang quản trị.'],
  ['SSE', 'Server-Sent Events', 'Máy chủ đẩy sự kiện xuống trình duyệt qua HTTP.'],
  ['API / REST', 'Application Programming Interface', 'Giao diện để frontend trao đổi dữ liệu với backend qua HTTP.'],
  ['JWT', 'JSON Web Token', 'Token xác thực phiên đăng nhập quản trị.'],
  ['Migration', 'Thay đổi lược đồ có phiên bản', 'Các file SQL tạo/cập nhật cấu trúc CSDL theo thứ tự.'],
  ['Seed', 'Khởi tạo dữ liệu mẫu', 'Nạp sản phẩm, khách hàng, đơn hàng mẫu để phát triển và trình diễn.'],
  ['EXPLAIN ANALYZE', 'Kế hoạch thực thi', 'Lệnh PostgreSQL cho biết planner dùng index nào và mất bao lâu.'],
  ['pgbench', 'Công cụ đo tải', 'Công cụ chuẩn của PostgreSQL mô phỏng nhiều client đồng thời.'],
];

/** Trang danh mục thuật ngữ — dựng TRƯỚC thân bài để là Bảng 1 */
function termsPage() {
  H.regH1('DANH MỤC THUẬT NGỮ VÀ TỪ VIẾT TẮT');
  return [
    pageBreak(),
    center('DANH MỤC THUẬT NGỮ VÀ TỪ VIẾT TẮT', { bold: true, size: 28, color: H.BLUE, after: 160 }),
    ...H.table([{ w: 3.2, h: 'Thuật ngữ' }, { w: 4.8, h: 'Tên đầy đủ / nghĩa' }, { w: 8, h: 'Cách dùng trong đề tài' }], TERMS, 1, 'Danh mục thuật ngữ và từ viết tắt'),
  ];
}

/** Mục lục + danh mục hình/bảng — dựng SAU CÙNG (registry đã đầy đủ), nhưng đặt trước thuật ngữ trong tài liệu */
function tocPages() {
  return [
    pageBreak(),
    center('MỤC LỤC', { bold: true, size: 28, color: H.BLUE, after: 240 }),
    ...H.tocHeadings(1),
    pageBreak(),
    center('DANH MỤC HÌNH ẢNH', { bold: true, size: 28, color: H.BLUE, after: 240 }),
    ...H.tocFigures(),
    new Paragraph({ spacing: { before: 360 } }),
    center('DANH MỤC BẢNG BIỂU', { bold: true, size: 28, color: H.BLUE, after: 240 }),
    ...H.tocTables(),
  ];
}

function summary() {
  return [
    pageBreak(),
    ...H.regH1('TÓM TẮT'),
    center('TÓM TẮT', { bold: true, size: 28, color: H.BLUE, after: 240 }),
    RP('Đề tài xây dựng hệ thống bán hàng trang sức trực tuyến trên hệ quản trị PostgreSQL 16, với mục tiêu kép: nghiên cứu các tính năng khác biệt của PostgreSQL so với các HQTCSDL phổ biến và vận dụng chúng vào một ứng dụng hoàn chỉnh có giao diện khách hàng và quản trị. Phương pháp thực hiện gồm phân tích nghiệp vụ bán trang sức; thiết kế lược đồ 8 bảng với đầy đủ khoá, ràng buộc và generated column; viết lược đồ bằng SQL thuần trong 6 file migration; hiện thực backend Node.js/Fastify không dùng ORM và frontend Next.js; đóng gói bằng Docker Compose. Sáu tính năng của PostgreSQL được gắn với sáu bài toán nghiệp vụ cụ thể: JSONB cho thuộc tính sản phẩm linh hoạt, full-text search tiếng Việt kết hợp pg_trgm, pgvector cho gợi ý sản phẩm tương tự, partitioning theo tháng và BRIN cho bảng đơn hàng, transaction với SELECT … FOR UPDATE chống bán quá tồn kho, materialized view và LISTEN/NOTIFY cho dashboard thời gian thực. Kết quả đo trên 1.035.853 đơn hàng bằng công cụ đo tự viết cho thấy index phù hợp nhanh hơn quét tuần tự từ 2,6 đến hơn 1.000 lần, partition pruning chỉ quét 1/37 partition, BRIN nhỏ hơn B-tree 26 lần, và 50 client đặt hàng đồng thời không bao giờ bán quá tồn kho.'),
  ];
}

function intro() {
  return [
    pageBreak(),
    ...H.regH1('LỜI MỞ ĐẦU'),
    center('LỜI MỞ ĐẦU', { bold: true, size: 28, color: H.BLUE, after: 240 }),
    H2('1. Lý do chọn đề tài'),
    RP('Trong hoạt động kinh doanh trang sức, dữ liệu có nhiều đặc thù: mỗi loại sản phẩm (nhẫn, bông tai, dây chuyền, vòng tay…) có bộ thuộc tính khác nhau (ni nhẫn, carat, chiều dài dây, loại đá…); tồn kho mỗi mã thường rất ít, có khi chỉ một chiếc; khách hàng tìm kiếm bằng tiếng Việt có dấu hoặc không dấu và hay gõ sai chính tả; đơn hàng tích luỹ ngày càng lớn theo thời gian; người quản lý cần báo cáo doanh thu nhanh và được cảnh báo kịp thời khi hàng sắp hết. Một hệ quản trị CSDL quan hệ thông thường chỉ với bảng – khoá – index B-tree giải quyết được bài toán nhưng không tối ưu, thường phải kéo thêm nhiều thành phần bên ngoài (Elasticsearch để tìm kiếm, Redis để cache, hàng đợi để thông báo…).'),
    RP('PostgreSQL là HQTCSDL mã nguồn mở đang đứng thứ 4 bảng xếp hạng DB-Engines và là hệ CSDL có mức tăng điểm cao nhất nửa đầu năm 2026 [1][2]. Điểm mạnh của PostgreSQL không chỉ ở việc tuân thủ chuẩn SQL mà còn ở hệ sinh thái tính năng và extension phong phú: JSONB, full-text search, pgvector, partitioning, nhiều loại index chuyên biệt, materialized view, LISTEN/NOTIFY… Những tính năng này cho phép giải quyết trọn vẹn các đặc thù nêu trên ngay bên trong một CSDL duy nhất.'),
    RP('Vì vậy nhóm chọn đề tài **“Xây dựng hệ thống bán hàng trang sức với PostgreSQL”** để vừa nghiên cứu các tính năng nổi bật của PostgreSQL, vừa vận dụng vào một ứng dụng hoàn chỉnh có giao diện cho khách hàng và người quản trị.'),
    H2('2. Mục tiêu của đề tài'),
    ...bullets([
      'Tìm hiểu tổng quan PostgreSQL: lịch sử, kiến trúc, vị trí trên thị trường và các tính năng khác biệt so với các HQTCSDL phổ biến.',
      'Phân tích nghiệp vụ bán hàng trang sức và thiết kế CSDL quan hệ phù hợp trên PostgreSQL, có đầy đủ ràng buộc và chỉ mục.',
      'Vận dụng và đánh giá **6 tính năng nổi bật** của PostgreSQL gắn với 6 bài toán nghiệp vụ cụ thể: JSONB; full-text search tiếng Việt; pgvector; partitioning + BRIN; transaction với khoá dòng; materialized view + LISTEN/NOTIFY.',
      'Xây dựng ứng dụng web hoàn chỉnh (trang bán hàng + trang quản trị) với backend Node.js dùng SQL thuần (không ORM) và frontend Next.js; đóng gói triển khai bằng Docker.',
      'Đo lường hiệu năng bằng công cụ đo tự viết (EXPLAIN ANALYZE), pgbench và giám sát bằng pg_stat_statements ngay trong trang quản trị.',
    ]),
    H2('3. Đối tượng và phạm vi nghiên cứu'),
    RP('**Đối tượng:** HQTCSDL PostgreSQL phiên bản 16 và các extension đi kèm (pg_trgm, unaccent, pgvector, pg_stat_statements).'),
    RP('**Phạm vi nghiệp vụ:** bán trang sức trực tuyến ở mức cơ bản: quản lý danh mục – sản phẩm – tồn kho, tìm kiếm, giỏ hàng, đặt hàng, duyệt/huỷ đơn, báo cáo doanh thu. Không đi sâu vào thanh toán trực tuyến, vận chuyển, chương trình khuyến mãi hay nhiều kho hàng. Trọng tâm của tiểu luận là phần cơ sở dữ liệu; ứng dụng được xây dựng đủ để minh hoạ và kiểm chứng.'),
    H2('4. Phương pháp thực hiện'),
    ...bullets([
      'Nghiên cứu tài liệu chính thức của PostgreSQL và các extension; tham khảo bảng xếp hạng DB-Engines.',
      'Phân tích nghiệp vụ, thiết kế ERD, viết lược đồ bằng SQL thuần theo từng file migration.',
      'Xây dựng ứng dụng theo mô hình 3 lớp (trình duyệt – API – CSDL), đưa logic nghiệp vụ quan trọng (đặt hàng) vào hàm PL/pgSQL trong CSDL.',
      'Sinh dữ liệu đủ lớn (hơn 3.000 sản phẩm, 1 triệu đơn hàng, 37 partition) và viết công cụ đo riêng so sánh có/không index bằng EXPLAIN ANALYZE; kiểm chứng tính đúng đắn bằng kịch bản đặt hàng đồng thời với pgbench.',
    ]),
    H2('5. Bố cục tiểu luận'),
    RP('Ngoài phần mở đầu, kết luận, tài liệu tham khảo và phụ lục, tiểu luận gồm 5 chương:'),
    ...bullets([
      '**Chương 1 – Tổng quan về PostgreSQL:** lịch sử, kiến trúc, vị trí trên thị trường, lý do lựa chọn.',
      '**Chương 2 – Phân tích nghiệp vụ và thiết kế cơ sở dữ liệu:** chức năng, ERD, mô tả từng bảng, ràng buộc, migration.',
      '**Chương 3 – Các tính năng nổi bật của PostgreSQL áp dụng trong hệ thống:** 6 tính năng chính và hệ thống chỉ mục.',
      '**Chương 4 – Xây dựng ứng dụng:** kiến trúc, backend, frontend, giao diện, triển khai Docker.',
      '**Chương 5 – Kiểm thử, benchmark và giám sát:** dữ liệu 1 triệu đơn, công cụ đo, kết quả có/không index, kiểm chứng đồng thời, giám sát.',
    ]),
    pageBreak(),
  ];
}

module.exports = { coverPage, reviewPage, termsPage, tocPages, summary, intro, INFO };
