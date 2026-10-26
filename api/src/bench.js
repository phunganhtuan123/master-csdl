#!/usr/bin/env node
// =====================================================================
// bench.js - Công cụ đo hiệu năng PostgreSQL cho tiểu luận
//   cd api && npm run bench
//   ROUNDS=7 npm run bench                         số lần lặp mỗi truy vấn (mặc định 5, lấy TRUNG VỊ)
//   OUT=../docs/benchmark npm run bench            thư mục xuất báo cáo
//
// Mỗi kịch bản chạy 2 lần cấu hình: (A) có index, (B) tắt index bằng SET LOCAL enable_... = off
// hoặc so với câu truy vấn tương đương không dùng cấu trúc đặc biệt. Ghi lại:
//   thời gian thực thi (ms, trung vị), số buffer đọc, loại scan planner chọn, số partition quét.
// Ngoài ra đo kích thước index (BRIN vs B-tree, partial vs full) và thống kê dữ liệu.
// Kết quả: bench-report.md (dán vào tiểu luận), bench-report.json (vẽ biểu đồ), in ra màn hình.
// =====================================================================
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROUNDS = Number(process.env.ROUNDS) || 5;
const OUT = process.env.OUT || path.resolve(process.cwd(), '../docs/benchmark');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/jewelry', max: 2 });

// ---------------------------------------------------------------- kịch bản
const SCENARIOS = [
  {
    key: 'jsonb_gin', group: 'Index', title: 'JSONB @> với GIN (jsonb_path_ops)',
    sql: `SELECT count(*) FROM products WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}'`,
    off: 'enable_bitmapscan',
  },
  {
    key: 'fts_gin', group: 'Index', title: 'Full-text search tiếng Việt (GIN tsvector)',
    sql: `SELECT id FROM products WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn kim cương 18k')) LIMIT 20`,
    off: 'enable_bitmapscan',
  },
  {
    key: 'trgm', group: 'Index', title: 'Tìm gần đúng bằng trigram (gõ sai chính tả)',
    sql: `SELECT id FROM products WHERE vi_unaccent(name) % 'nhan kim cuog solitare'`,
    off: 'enable_bitmapscan',
  },
  {
    key: 'vector_hnsw', group: 'Index', title: 'pgvector: 8 láng giềng gần nhất (HNSW)',
    sql: `SELECT id FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku = 'NK-001') LIMIT 8`,
    off: 'enable_indexscan',
  },
  {
    key: 'partition_pruning', group: 'Partition', title: 'Doanh thu 2 tuần: partition pruning + BRIN',
    sql: `SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-09-01' AND created_at < '2026-09-15'`,
    off: 'enable_partition_pruning',
  },
  {
    key: 'partition_month', group: 'Partition', title: 'Báo cáo doanh thu 1 tháng theo trạng thái',
    sql: `SELECT status, count(*), sum(total) FROM orders WHERE created_at >= '2026-06-01' AND created_at < '2026-07-01' GROUP BY status`,
    off: 'enable_partition_pruning',
  },
  {
    key: 'brin_vs_seq', group: 'Partition', title: 'BRIN lọc 3 ngày (ép dùng BRIN) so với quét cả partition',
    sql: `SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-06-10' AND created_at < '2026-06-13'`,
    force: 'enable_seqscan', off: 'enable_bitmapscan',
  },
  {
    key: 'covering', group: 'Index', title: 'Lịch sử mua của khách: covering index (INCLUDE)',
    sql: `SELECT id, status, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20`,
    off: ['enable_indexscan', 'enable_indexonlyscan', 'enable_bitmapscan'],
  },
  {
    key: 'partial_pending', group: 'Index', title: 'Đơn chờ xử lý mới nhất: partial index',
    sql: `SELECT id, created_at FROM orders WHERE status IN ('pending','confirmed') ORDER BY created_at DESC LIMIT 50`,
    off: ['enable_indexscan', 'enable_bitmapscan'],
  },
  {
    key: 'partial_lowstock', group: 'Index', title: 'Sản phẩm sắp hết hàng: partial index',
    sql: `SELECT id, name, stock FROM products WHERE stock < 3 AND status = 'active' ORDER BY stock LIMIT 20`,
    off: ['enable_indexscan', 'enable_bitmapscan'],
  },
  {
    key: 'matview', group: 'Materialized view', title: 'Doanh thu 30 ngày: matview vs tính trực tiếp',
    sql: `SELECT day, revenue FROM mv_sales_daily WHERE day >= current_date - 30 ORDER BY day`,
    compare: `SELECT date_trunc('day', o.created_at)::date AS day, sum(o.total) FROM orders o
              WHERE o.created_at >= current_date - 30 AND o.status <> 'cancelled' GROUP BY 1 ORDER BY 1`,
  },
  {
    key: 'matview_top', group: 'Materialized view', title: 'Top 10 sản phẩm bán chạy: matview vs JOIN toàn bộ',
    sql: `SELECT product_id, qty_sold FROM mv_top_products LIMIT 10`,
    compare: `SELECT oi.product_id, sum(oi.qty) AS qty_sold FROM order_items oi
              JOIN orders o ON o.id = oi.order_id AND o.created_at = oi.order_created_at
              WHERE o.status <> 'cancelled' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
  },
];

// ---------------------------------------------------------------- đo
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function explain(client, sql, offSetting) {
  const times = [], plans = [];
  for (let i = 0; i < ROUNDS; i++) {
    await client.query('BEGIN');
    for (const o of [].concat(offSetting || [])) await client.query(`SET LOCAL ${o} = off`);
    const { rows } = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
    await client.query('ROLLBACK');
    const p = rows[0]['QUERY PLAN'][0];
    times.push(p['Execution Time']);
    plans.push(p);
  }
  const best = plans[times.indexOf(median(times))];
  const root = best.Plan;
  const walk = (n, acc) => { acc.push(n); (n.Plans || []).forEach((c) => walk(c, acc)); return acc; };
  const nodes = walk(root, []);
  const scans = nodes.filter((n) => /Scan/.test(n['Node Type']));
  const partitions = new Set(scans.map((n) => n['Relation Name']).filter((r) => r && /^orders_/.test(r)));
  // index con của partition (orders_2026_01_xxx_idx) gom thành 1 tên cho gọn
  const indexes = [...new Set(scans.map((n) => n['Index Name']).filter(Boolean).map((i) => i.replace(/^orders_(\d{4}_\d{2}|default)_/, 'orders_*_')))];
  return {
    ms: +median(times).toFixed(3),
    min_ms: +Math.min(...times).toFixed(3),
    buffers: (root['Shared Hit Blocks'] || 0) + (root['Shared Read Blocks'] || 0),
    scan: scans.map((n) => n['Node Type']).filter((v, i, a) => a.indexOf(v) === i).join(' + '),
    indexes, partitions_scanned: partitions.size || null,
    heap_fetches: nodes.some((n) => n['Heap Fetches'] != null) ? nodes.reduce((a, n) => a + (n['Heap Fetches'] || 0), 0) : null,
  };
}

async function sizes(client) {
  const q = async (sql) => (await client.query(sql)).rows;
  // BRIN vs B-tree trên cùng cột created_at của bảng orders (tạo tạm B-tree rồi xoá)
  await client.query('CREATE INDEX IF NOT EXISTS tmp_bench_btree ON orders (created_at)');
  const [brin] = await q(`SELECT pg_size_pretty(sum(pg_relation_size(inhrelid))) s, sum(pg_relation_size(inhrelid))::bigint b FROM pg_inherits WHERE inhparent = 'idx_orders_created_brin'::regclass`);
  const [btree] = await q(`SELECT pg_size_pretty(sum(pg_relation_size(inhrelid))) s, sum(pg_relation_size(inhrelid))::bigint b FROM pg_inherits WHERE inhparent = 'tmp_bench_btree'::regclass`);
  await client.query('DROP INDEX tmp_bench_btree');
  const [partial] = await q(`SELECT pg_size_pretty(sum(pg_relation_size(inhrelid))) s FROM pg_inherits WHERE inhparent = 'idx_orders_pending'::regclass`);
  const [cover] = await q(`SELECT pg_size_pretty(sum(pg_relation_size(inhrelid))) s FROM pg_inherits WHERE inhparent = 'idx_orders_customer_cover'::regclass`);
  const [low] = await q(`SELECT pg_size_pretty(pg_relation_size('idx_products_low_stock')) s`);
  const [pk] = await q(`SELECT pg_size_pretty(pg_relation_size('products_pkey')) s`);
  const prod = await q(`SELECT indexrelname AS index, pg_size_pretty(pg_relation_size(indexrelid)) AS size FROM pg_stat_user_indexes WHERE relname='products' ORDER BY pg_relation_size(indexrelid) DESC`);
  return { brin_created_at: brin.s, btree_created_at: btree.s, brin_ratio: +(btree.b / brin.b).toFixed(1), partial_pending: partial.s, covering_customer: cover.s, partial_low_stock: low.s, products_pkey: pk.s, products_indexes: prod };
}

async function stats(client) {
  const [r] = (await client.query(`
    SELECT version() AS version,
           (SELECT count(*) FROM products) AS products,
           (SELECT count(*) FROM orders) AS orders,
           (SELECT count(*) FROM order_items) AS order_items,
           (SELECT count(*) FROM customers) AS customers,
           (SELECT count(*) FROM pg_inherits WHERE inhparent = 'orders'::regclass) AS partitions,
           (SELECT pg_size_pretty(sum(pg_total_relation_size(inhrelid))) FROM pg_inherits WHERE inhparent = 'orders'::regclass) AS orders_size,
           pg_size_pretty(pg_total_relation_size('order_items')) AS order_items_size,
           pg_size_pretty(pg_database_size(current_database())) AS db_size,
           current_setting('shared_buffers') AS shared_buffers,
           current_setting('work_mem') AS work_mem`)).rows;
  r.version = r.version.split(' on ')[0];
  return r;
}

// ---------------------------------------------------------------- chạy
async function main() {
  const client = await pool.connect();
  const started = new Date();
  try {
    console.log(`Benchmark PostgreSQL — ${ROUNDS} lần/kịch bản, lấy trung vị\n`);
    await client.query('VACUUM ANALYZE');
    const info = await stats(client);
    console.log(`${info.version} · ${Number(info.orders).toLocaleString()} đơn / ${info.partitions} partition / ${info.orders_size} · ${Number(info.order_items).toLocaleString()} chi tiết · shared_buffers ${info.shared_buffers}\n`);

    const results = [];
    const pad = (s, n) => String(s).padEnd(n);
    console.log(pad('Kịch bản', 52) + pad('Có index', 12) + pad('Không index', 13) + pad('Nhanh hơn', 11) + 'Scan (có index)');
    console.log('-'.repeat(120));
    for (const sc of SCENARIOS) {
      const a = await explain(client, sc.sql, sc.force || null);
      const b = sc.compare ? await explain(client, sc.compare, null) : await explain(client, sc.sql, sc.off);
      const speedup = +(b.ms / Math.max(a.ms, 0.001)).toFixed(1);
      const r = { ...sc, with_index: a, without_index: { ...b, label: sc.compare ? 'truy vấn tương đương' : `SET ${[].concat(sc.off).join(', ')} = off` }, speedup };
      results.push(r);
      console.log(pad(sc.title, 52) + pad(a.ms + ' ms', 12) + pad(b.ms + ' ms', 13) + pad(speedup + '×', 11) + a.scan + (a.partitions_scanned ? ` [${a.partitions_scanned}/${b.partitions_scanned} partition]` : ''));
    }

    console.log('\nKích thước index:');
    const sz = await sizes(client);
    console.log(`  BRIN created_at ${sz.brin_created_at}  vs  B-tree ${sz.btree_created_at}  (nhỏ hơn ${sz.brin_ratio}×)`);
    console.log(`  Partial idx_orders_pending ${sz.partial_pending} · Covering idx_orders_customer_cover ${sz.covering_customer} · Partial low_stock ${sz.partial_low_stock} vs PK ${sz.products_pkey}`);

    // ---------------- xuất báo cáo
    fs.mkdirSync(OUT, { recursive: true });
    const report = { generated_at: started.toISOString(), rounds: ROUNDS, info, sizes: sz, results };
    fs.writeFileSync(path.join(OUT, 'bench-report.json'), JSON.stringify(report, null, 1));

    const md = [];
    md.push(`# Kết quả benchmark PostgreSQL`, '', `*Sinh lúc ${started.toLocaleString('vi-VN')} · ${ROUNDS} lần mỗi kịch bản, lấy trung vị · ${info.version}*`, '');
    md.push(`| Dữ liệu | Giá trị |`, `|---|---|`,
      `| Sản phẩm | ${Number(info.products).toLocaleString('vi-VN')} |`,
      `| Đơn hàng | ${Number(info.orders).toLocaleString('vi-VN')} (${info.partitions} partition, ${info.orders_size}) |`,
      `| Chi tiết đơn | ${Number(info.order_items).toLocaleString('vi-VN')} (${info.order_items_size}) |`,
      `| Dung lượng CSDL | ${info.db_size} |`, `| shared_buffers / work_mem | ${info.shared_buffers} / ${info.work_mem} |`, '');
    md.push(`## Thời gian thực thi có / không có index`, '', `| # | Kịch bản | Có index (ms) | Không index (ms) | Nhanh hơn | Scan khi có index | Partition quét |`, `|---|---|---:|---:|---:|---|---:|`);
    results.forEach((r, i) => md.push(`| ${i + 1} | ${r.title} | ${r.with_index.ms} | ${r.without_index.ms} | **${r.speedup}×** | ${r.with_index.scan}${r.with_index.indexes.length ? ` (${r.with_index.indexes.join(', ')})` : ''}${r.with_index.heap_fetches != null ? `, Heap Fetches ${r.with_index.heap_fetches}` : ''} | ${r.with_index.partitions_scanned ? `${r.with_index.partitions_scanned} / ${r.without_index.partitions_scanned}` : '–'} |`));
    md.push('', `## Kích thước index`, '', `| Index | Kích thước | Ghi chú |`, `|---|---:|---|`,
      `| BRIN trên orders(created_at) | ${sz.brin_created_at} | tổng ${info.partitions} partition |`,
      `| B-tree trên orders(created_at) | ${sz.btree_created_at} | tạo tạm để so sánh — BRIN nhỏ hơn **${sz.brin_ratio}×** |`,
      `| Partial idx_orders_pending | ${sz.partial_pending} | chỉ đơn pending/confirmed |`,
      `| Covering idx_orders_customer_cover | ${sz.covering_customer} | INCLUDE (id, status, total) |`,
      `| Partial idx_products_low_stock | ${sz.partial_low_stock} | so với PK products ${sz.products_pkey} |`);
    md.push('', `### Index trên bảng products`, '', `| Index | Kích thước |`, `|---|---:|`, ...sz.products_indexes.map((x) => `| ${x.index} | ${x.size} |`));
    md.push('', `## Câu SQL của từng kịch bản`, '');
    results.forEach((r, i) => md.push(`**${i + 1}. ${r.title}** — không index: \`${r.without_index.label}\``, '', '```sql', r.sql.trim(), ...(r.compare ? ['-- so với:', r.compare.replace(/\n\s+/g, '\n').trim()] : []), '```', ''));
    fs.writeFileSync(path.join(OUT, 'bench-report.md'), md.join('\n'));
    console.log(`\n✔ Đã ghi ${path.join(OUT, 'bench-report.md')} và bench-report.json`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
