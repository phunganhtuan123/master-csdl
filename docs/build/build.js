const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Footer, PageNumber, AlignmentType, NumberFormat, HeadingLevel } = require('docx');
const H = require('./helpers');
const { coverPage, reviewPage, tocPages, intro } = require('./front');

const { chapter1, chapter2 } = require('./ch1_ch2');
const { chapter3 } = require('./ch3');
const { chapter4, chapter5, conclusion } = require('./ch4_ch5');
// Pass 2: nạp số trang đo được từ PDF pass 1 (node build.js pages.json)
if (process.argv[2]) H.setPages(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
// Dựng phần thân trước để thu thập heading/caption, rồi mới dựng mục lục
const bodyChildren = [...intro(), ...chapter1(), ...chapter2(), ...chapter3(), ...chapter4(), ...chapter5(), ...conclusion()];
fs.writeFileSync(__dirname + '/registry.json', JSON.stringify(H.registry, null, 1));

const page = {
  size: { width: 11906, height: 16838 },                  // A4
  margin: { top: H.cm(3), bottom: H.cm(3), left: H.cm(3.5), right: H.cm(2), footer: H.cm(1.5), header: H.cm(1.5) },
};
const footer = (fmt) => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ children: [PageNumber.CURRENT], font: H.FONT, size: 26 })] })] });

const doc = new Document({
  creator: 'Nhóm 6', title: 'Xây dựng hệ thống bán hàng trang sức với PostgreSQL',
    numbering: H.numberingConfig,
  styles: {
    default: { document: { run: { font: H.FONT, size: H.SZ }, paragraph: { spacing: { line: H.LINE, lineRule: 'auto' } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: H.FONT, size: 28, bold: true, color: '000000' }, paragraph: { outlineLevel: 0, spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: H.FONT, size: 26, bold: true, color: '000000' }, paragraph: { outlineLevel: 1, spacing: { before: 240, after: 120 } } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: H.FONT, size: 26, bold: true, italics: true, color: '000000' }, paragraph: { outlineLevel: 2, spacing: { before: 160, after: 80 } } },
      { id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal', run: { font: H.FONT, size: 26, bold: true }, paragraph: { alignment: AlignmentType.CENTER } },
    ],
  },
  sections: [
    { properties: { page }, children: coverPage() },                                          // bìa: không số trang
    { properties: { page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      footers: { default: footer() }, children: [...reviewPage(), ...tocPages()] },           // i, ii, iii…
    { properties: { page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      footers: { default: footer() },
      children: bodyChildren },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = '/home/claude/jewelry-shop-postgres/docs/TieuLuan_CSDL_Nhom6_PostgreSQL.docx';
  fs.writeFileSync(out, buf);
  console.log('wrote', out, (buf.length / 1024 / 1024).toFixed(1), 'MB');
});
