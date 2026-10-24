// Trang bìa, trang phụ bìa, lời cảm ơn/nhận xét, mục lục, danh mục hình/bảng/viết tắt, mở đầu
const { Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const H = require('./helpers');
const { P, RP, H1, H2, bullets, numbered, pageBreak, center, run, cm, LINE, CONTENT_W } = H;

const INFO = {
  truong: 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP. HỒ CHÍ MINH',
  vien: 'VIỆN ĐÀO TẠO SAU ĐẠI HỌC',
  mon: 'CƠ SỞ DỮ LIỆU',
  detai: 'XÂY DỰNG HỆ THỐNG BÁN HÀNG TRANG SỨC\nVỚI POSTGRESQL',
  nhom: 'Nhóm 6',
  tv: [['Phùng Anh Tuấn', '2541864024'], ['Võ Bùi Duy Thông', '2541864019']],
  gv: '……………………………',
  lop: '……………………………',
  noi: 'TP. Hồ Chí Minh, tháng 10 năm 2026',
};

function coverPage() {
  const out = [];
  out.push(center('BỘ GIÁO DỤC VÀ ĐÀO TẠO', { bold: true, size: 26 }));
  out.push(center(INFO.truong, { bold: true, size: 28 }));
  out.push(center(INFO.vien, { bold: true, size: 26, after: 120 }));
  out.push(center('——————  •  ——————', { size: 24, after: 1600 }));
  out.push(center('TIỂU LUẬN MÔN HỌC', { bold: true, size: 32, after: 120 }));
  out.push(center(INFO.mon, { bold: true, size: 36, after: 600 }));
  out.push(center('Đề tài:', { italics: true, size: 28, after: 120 }));
  for (const line of INFO.detai.split('\n')) out.push(center(line, { bold: true, size: 36 }));
  out.push(center('', { after: 1400 }));
  const rows = [
    ['Giảng viên hướng dẫn:', INFO.gv],
    ['Lớp:', INFO.lop],
    ['Nhóm thực hiện:', INFO.nhom],
    ...INFO.tv.map(([n, m], i) => [i === 0 ? 'Thành viên:' : '', `${n} – MSSV: ${m}`]),
  ];
  const t = new Table({
    width: { size: cm(15), type: WidthType.DXA }, columnWidths: [cm(5.5), cm(9.5)], alignment: AlignmentType.CENTER,
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: rows.map(([a, b]) => new TableRow({ children: [
      new TableCell({ width: { size: cm(5.5), type: WidthType.DXA }, children: [new Paragraph({ spacing: { line: LINE }, children: [run(a, { bold: true, size: 26 })] })] }),
      new TableCell({ width: { size: cm(9.5), type: WidthType.DXA }, children: [new Paragraph({ spacing: { line: LINE }, children: [run(b, { size: 26 })] })] }),
    ] })),
  });
  out.push(t);
  out.push(center('', { after: 1400 }));
  out.push(center(INFO.noi, { bold: true, size: 26 }));
  out.push(pageBreak());
  return out;
}

function reviewPage() {
  return [
    center('NHẬN XÉT CỦA GIẢNG VIÊN', { bold: true, size: 28, after: 240 }),
    ...Array.from({ length: 14 }, () => new Paragraph({ spacing: { line: 480, lineRule: 'auto' }, children: [run('.'.repeat(110), { size: 26 })] })),
    center('', { after: 240 }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { line: LINE }, children: [run('TP. Hồ Chí Minh, ngày …… tháng …… năm 2026', { italics: true })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { line: LINE }, children: [run('Giảng viên', { bold: true })] }),
    pageBreak(),
    center('PHÂN CÔNG CÔNG VIỆC NHÓM 6', { bold: true, size: 28, after: 240 }),
    ...H.table(
      [{ w: 1, h: 'STT' }, { w: 4, h: 'Thành viên' }, { w: 9, h: 'Nội dung thực hiện' }, { w: 2.5, h: 'Mức độ' }],
      [
        ['1', 'Phùng Anh Tuấn\n2541864024'.replace('\n', ' – '), 'Thiết kế CSDL, migration, index, hàm PL/pgSQL; backend Node.js; benchmark; viết chương 2, 3, 5', '100%'],
        ['2', 'Võ Bùi Duy Thông – 2541864019', 'Phân tích nghiệp vụ; giao diện Next.js (khách hàng + quản trị); Docker, Grafana; viết chương 1, 4, kết luận; slide', '100%'],
      ], null),
    pageBreak(),
  ];
}

function tocPages() {
  return [
    center('MỤC LỤC', { bold: true, size: 28, after: 240 }),
    ...H.tocHeadings(),
    pageBreak(),
    center('DANH MỤC HÌNH ẢNH', { bold: true, size: 28, after: 240 }),
    ...H.tocFigures(),
    pageBreak(),
    center('DANH MỤC BẢNG BIỂU', { bold: true, size: 28, after: 240 }),
    ...H.tocTables(),
    pageBreak(),
    center('DANH MỤC TỪ VIẾT TẮT', { bold: true, size: 28, after: 240 }),
    ...H.table(
      [{ w: 3, h: 'Từ viết tắt' }, { w: 6, h: 'Tiếng Anh' }, { w: 7, h: 'Ý nghĩa' }],
      [
        ['CSDL', 'Database', 'Cơ sở dữ liệu'],
        ['HQTCSDL', 'DBMS – Database Management System', 'Hệ quản trị cơ sở dữ liệu'],
        ['SQL', 'Structured Query Language', 'Ngôn ngữ truy vấn có cấu trúc'],
        ['ORM', 'Object-Relational Mapping', 'Ánh xạ đối tượng – quan hệ (thư viện trung gian giữa code và SQL)'],
        ['API', 'Application Programming Interface', 'Giao diện lập trình ứng dụng'],
        ['REST', 'Representational State Transfer', 'Kiến trúc API dựa trên HTTP'],
        ['JSON / JSONB', 'JavaScript Object Notation (Binary)', 'Định dạng dữ liệu dạng cặp khoá–giá trị; JSONB là dạng nhị phân có index trong PostgreSQL'],
        ['FTS', 'Full-Text Search', 'Tìm kiếm toàn văn'],
        ['GIN', 'Generalized Inverted Index', 'Chỉ mục đảo ngược tổng quát'],
        ['BRIN', 'Block Range Index', 'Chỉ mục theo khoảng khối'],
        ['HNSW', 'Hierarchical Navigable Small World', 'Thuật toán index tìm láng giềng gần nhất cho vector'],
        ['MVCC', 'Multi-Version Concurrency Control', 'Điều khiển đồng thời đa phiên bản'],
        ['ACID', 'Atomicity, Consistency, Isolation, Durability', 'Bốn tính chất của giao dịch'],
        ['WAL', 'Write-Ahead Log', 'Nhật ký ghi trước'],
        ['SSE', 'Server-Sent Events', 'Cơ chế máy chủ đẩy sự kiện xuống trình duyệt'],
        ['JWT', 'JSON Web Token', 'Chuỗi xác thực phiên đăng nhập'],
        ['TPS', 'Transactions Per Second', 'Số giao dịch mỗi giây'],
        ['ERD', 'Entity Relationship Diagram', 'Sơ đồ thực thể – quan hệ'],
        ['SSR', 'Server-Side Rendering', 'Kết xuất giao diện phía máy chủ'],
      ], null),
    pageBreak(),
  ];
}

function intro() {
  return [
    H1('Mở đầu'),
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
      'Đo lường hiệu năng bằng EXPLAIN ANALYZE, pgbench và giám sát bằng pg_stat_statements, Grafana.',
    ]),
    H2('3. Đối tượng và phạm vi nghiên cứu'),
    RP('**Đối tượng:** HQTCSDL PostgreSQL phiên bản 16 và các extension đi kèm (pg_trgm, unaccent, pgvector, pg_stat_statements).'),
    RP('**Phạm vi nghiệp vụ:** bán trang sức trực tuyến ở mức cơ bản: quản lý danh mục – sản phẩm – tồn kho, tìm kiếm, giỏ hàng, đặt hàng, duyệt/huỷ đơn, báo cáo doanh thu. Không đi sâu vào thanh toán trực tuyến, vận chuyển, chương trình khuyến mãi hay nhiều kho hàng. Trọng tâm của tiểu luận là phần cơ sở dữ liệu; ứng dụng được xây dựng đủ để minh hoạ và kiểm chứng.'),
    H2('4. Phương pháp thực hiện'),
    ...bullets([
      'Nghiên cứu tài liệu chính thức của PostgreSQL và các extension; tham khảo bảng xếp hạng DB-Engines.',
      'Phân tích nghiệp vụ, thiết kế ERD, viết lược đồ bằng SQL thuần theo từng file migration.',
      'Xây dựng ứng dụng theo mô hình 3 lớp (trình duyệt – API – CSDL), đưa logic nghiệp vụ quan trọng (đặt hàng) vào hàm PL/pgSQL trong CSDL.',
      'Sinh dữ liệu mẫu đủ lớn (hơn 3.000 sản phẩm, 30.000 đơn hàng) để đo lường; so sánh có/không index bằng EXPLAIN ANALYZE; kiểm chứng tính đúng đắn bằng kịch bản đặt hàng đồng thời.',
    ]),
    H2('5. Bố cục tiểu luận'),
    RP('Ngoài phần mở đầu, kết luận, tài liệu tham khảo và phụ lục, tiểu luận gồm 5 chương:'),
    ...bullets([
      '**Chương 1 – Tổng quan về PostgreSQL:** lịch sử, kiến trúc, vị trí trên thị trường, lý do lựa chọn.',
      '**Chương 2 – Phân tích nghiệp vụ và thiết kế cơ sở dữ liệu:** yêu cầu, ERD, mô tả từng bảng, ràng buộc.',
      '**Chương 3 – Các tính năng nổi bật của PostgreSQL áp dụng trong hệ thống:** 6 tính năng chính và hệ thống chỉ mục.',
      '**Chương 4 – Xây dựng ứng dụng:** kiến trúc, backend, frontend, giao diện, triển khai Docker.',
      '**Chương 5 – Kiểm thử, benchmark và giám sát:** kết quả đo lường, kiểm chứng tính đúng đắn, công cụ giám sát.',
    ]),
    pageBreak(),
  ];
}

module.exports = { coverPage, reviewPage, tocPages, intro, INFO };
