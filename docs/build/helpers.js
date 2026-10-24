// Helper tạo tiểu luận theo chuẩn: Times New Roman 13, giãn dòng 1.5, lề trên 3 / dưới 3 / trái 3.5 / phải 2 cm
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
  ImageRun, PageBreak, BorderStyle, SimpleField, TabStopType, LevelFormat,
} = require('docx');

const FONT = 'Times New Roman';
const SZ = 26;          // 13pt (half-points)
const LINE = 360;       // 1.5 lines
const IMG = path.resolve(__dirname, '../img');

// Sổ đăng ký để dựng mục lục tĩnh: mọi heading/caption được ghi lại theo thứ tự xuất hiện
const registry = { headings: [], figures: [], tables: [] };
const counters = {};   // counters['Hình']['3'] = số hình hiện tại trong chương 3
let PAGES = {};        // text đã chuẩn hoá -> số trang (nạp từ pass 1)
const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
function setPages(map) { PAGES = map; }
function resetRegistry() { registry.headings.length = 0; registry.figures.length = 0; registry.tables.length = 0; for (const k in counters) delete counters[k]; }

const cm = (v) => Math.round(v * 567);      // cm -> twips (DXA)
const CONTENT_W = cm(21 - 3.5 - 2);          // ≈ 15.5 cm

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || SZ, bold: o.bold, italics: o.italics, color: o.color });
const codeRun = (text, o = {}) => new TextRun({ text, font: 'Courier New', size: o.size || 18, bold: o.bold, color: o.color });

/** Đoạn văn thường: canh đều, thụt đầu dòng 1 cm */
function P(content, o = {}) {
  const children = typeof content === 'string' ? [run(content, o)] : content;
  return new Paragraph({
    children,
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { line: LINE, lineRule: 'auto', after: o.after ?? 120, before: o.before ?? 0 },
    indent: o.noIndent ? undefined : { firstLine: o.firstLine ?? cm(1) },
    keepNext: o.keepNext,
  });
}

/** Đoạn có chữ đậm/nghiêng/code xen kẽ: parse đơn giản **đậm**, *nghiêng*, `code` */
function rich(text, o = {}) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(run(text.slice(last, m.index), o));
    const t = m[0];
    if (t.startsWith('**')) parts.push(run(t.slice(2, -2), { ...o, bold: true }));
    else if (t.startsWith('`')) parts.push(codeRun(t.slice(1, -1), { size: 24 }));
    else parts.push(run(t.slice(1, -1), { ...o, italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(run(text.slice(last), o));
  return parts;
}
const RP = (text, o = {}) => P(rich(text, o), o);

function H1(text) {   // Chương: in hoa, đậm, 14pt, canh giữa
  registry.headings.push({ level: 1, text: text.toUpperCase() });
  return new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240, line: LINE, lineRule: 'auto' }, children: [run(text.toUpperCase(), { bold: true, size: 28 })] });
}
function H2(text) {
  registry.headings.push({ level: 2, text });
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: LINE, lineRule: 'auto' }, keepNext: true,
    children: [run(text, { bold: true, size: 26 })] });
}
function H3(text) {
  registry.headings.push({ level: 3, text });
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80, line: LINE, lineRule: 'auto' }, keepNext: true,
    children: [run(text, { bold: true, italics: true, size: 26 })] });
}

/** Danh sách gạch đầu dòng */
function bullets(items, o = {}) {
  return items.map((t) => new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { line: LINE, lineRule: 'auto', after: 60 },
    alignment: AlignmentType.JUSTIFIED,
    children: typeof t === 'string' ? rich(t, o) : t,
  }));
}
function numbered(items, ref = 'numbers') {
  return items.map((t) => new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { line: LINE, lineRule: 'auto', after: 60 },
    alignment: AlignmentType.JUSTIFIED,
    children: typeof t === 'string' ? rich(t) : t,
  }));
}

/** Khối mã nguồn: Consolas 9.5pt, nền xám, viền mảnh */
function code(text) {
  const lines = text.replace(/\t/g, '  ').split('\n');
  return lines.map((l, i) => new Paragraph({
    children: [codeRun(l || ' ')],
    spacing: { line: 240, lineRule: 'auto', after: i === lines.length - 1 ? 160 : 0, before: i === 0 ? 80 : 0 },
    shading: { type: ShadingType.CLEAR, fill: 'F3F3F3', color: 'auto' },
    indent: { left: cm(0.3), right: cm(0.3) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: 'B8902E', space: 4 },
      ...(i === 0 ? { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } } : {}),
      ...(i === lines.length - 1 ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } } : {}),
    },
    keepLines: true,
  }));
}

/** Caption đánh số tĩnh theo chương: Hình 3.1, Bảng 2.4 ... (không dùng field, mở ở đâu cũng đúng) */
function caption(kind, chapter, text) {
  counters[kind] = counters[kind] || {};
  counters[kind][chapter] = (counters[kind][chapter] || 0) + 1;
  const label = `${kind} ${chapter}.${counters[kind][chapter]}`;
  (kind === 'Hình' ? registry.figures : registry.tables).push({ label, text });
  return new Paragraph({
    style: 'Caption',
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200, line: LINE, lineRule: 'auto' },
    keepNext: kind === 'Bảng',
    children: [run(`${label}: ${text}`, { bold: true, size: 26 })],
  });
}

/** Một dòng mục lục: "text ....... trang" với tab phải có dấu chấm dẫn */
function tocLine(text, level = 1, key = text, o = {}) {
  const page = PAGES[norm(key)] ?? '';
  const indent = { 1: 0, 2: cm(0.6), 3: cm(1.2) }[level];
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, leader: 'dot', position: CONTENT_W }],
    spacing: { line: 300, lineRule: 'auto', after: level === 1 ? 60 : 20, before: level === 1 ? 100 : 0 },
    indent: { left: indent, right: cm(1.2), hanging: 0 },
    children: [run(text, { bold: level === 1, size: o.size || 26 }), run(`\t${page}`, { size: o.size || 26 })],
  });
}
function tocHeadings() { return registry.headings.map((h) => tocLine(h.text, h.level, h.text)); }
function tocFigures()  { return registry.figures.map((f) => tocLine(`${f.label}: ${f.text}`, 2, `${f.label}: ${f.text}`)); }
function tocTables()   { return registry.tables.map((f) => tocLine(`${f.label}: ${f.text}`, 2, `${f.label}: ${f.text}`)); }

/** Hình ảnh + chú thích. widthCm mặc định 15.5 */
function figure(file, chapter, text, widthCm = 15.5) {
  const p = path.join(IMG, file);
  const sizeOf = require('image-size');
  const buf = fs.readFileSync(p);
  const dim = sizeOf.imageSize ? sizeOf.imageSize(buf) : sizeOf(buf);
  const w = Math.round(widthCm * 37.8);     // cm -> px (96 dpi)
  const h = Math.round(w * dim.height / dim.width);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true,
      children: [new ImageRun({ type: file.endsWith('.png') ? 'png' : 'jpg', data: buf, transformation: { width: w, height: h } })] }),
    caption('Hình', chapter, text),
  ];
}

/** Bảng: header nền vàng nhạt; cols = [{w: cm, h: 'tiêu đề'}], rows = [[cell,...]] */
function table(cols, rows, chapter, text, o = {}) {
  const total = cols.reduce((s, c) => s + c.w, 0);
  const widths = cols.map((c) => Math.round(CONTENT_W * c.w / total));
  const cell = (content, { header = false, width, align } = {}) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: 'F6EFDD', color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    verticalAlign: 'center',
    children: (Array.isArray(content) ? content : [content]).map((c) => new Paragraph({
      alignment: align || (header ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: { line: 276, lineRule: 'auto', after: 0 },
      children: typeof c === 'string'
        ? (c.startsWith('`') && c.endsWith('`') ? [codeRun(c.slice(1, -1), { size: 22 })] : rich(c, { size: o.fontSize || 26, bold: header }))
        : c,
    })),
  });
  const t = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: cols.map((c, i) => cell(c.h, { header: true, width: widths[i] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { width: widths[i], align: cols[i].align })) })),
    ],
  });
  return chapter ? [caption('Bảng', chapter, text), t, new Paragraph({ spacing: { after: 120 } })] : [t, new Paragraph({ spacing: { after: 120 } })];
}

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

/** Dòng canh giữa (trang bìa) */
const center = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: o.line || LINE, after: o.after ?? 0, before: o.before ?? 0 },
  children: [run(text, o)] });

const numberingConfig = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: cm(1.25), hanging: cm(0.6) } }, run: { font: FONT } } }] },
    { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: cm(1.25), hanging: cm(0.6) } }, run: { font: FONT } } }] },
    ...['refs'].map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: cm(1.25), hanging: cm(0.6) } }, run: { font: FONT } } }] })),
  ],
};

module.exports = { registry, setPages, resetRegistry, tocHeadings, tocFigures, tocTables, norm, P, RP, H1, H2, H3, bullets, numbered, code, figure, table, caption, pageBreak, center, run, codeRun, rich, cm, FONT, SZ, LINE, CONTENT_W, numberingConfig };
