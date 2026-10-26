// =====================================================================
// seed-big.js - Sinh dữ liệu LỚN để kiểm chứng partition + index
//   npm run seed:big              -> 1.000.000 đơn hàng (mặc định)
//   BIG_ORDERS=3000000 npm run seed:big
// Đơn rải đều từ 01/2024 đến tháng hiện tại (~34 partition tháng),
// mỗi đơn 1-2 dòng chi tiết => ~1,5 triệu order_items.
// Chèn theo từng tháng bằng generate_series (chạy trong CSDL, không qua app) nên rất nhanh.
// Tồn kho KHÔNG bị trừ (dữ liệu lịch sử), cuối cùng ANALYZE + refresh materialized view.
// =====================================================================
import { pool } from './db.js';

const TOTAL = Number(process.env.BIG_ORDERS) || 1_000_000;
const START = new Date('2024-01-01');
const END = new Date(); END.setDate(1);              // tháng hiện tại

function monthRange() {
  const out = [];
  for (let d = new Date(START); d <= END; d.setMonth(d.getMonth() + 1)) out.push(new Date(d));
  return out;
}

async function main() {
  const client = await pool.connect();
  const t0 = Date.now();
  try {
    const months = monthRange();
    const perMonth = Math.ceil(TOTAL / months.length);
    const { rows: [{ n: products }] } = await client.query('SELECT count(*)::int AS n FROM products');
    const { rows: [{ n: customers }] } = await client.query('SELECT count(*)::int AS n FROM customers');
    console.log(`Sinh ${TOTAL.toLocaleString()} đơn hàng, ${months.length} tháng x ~${perMonth.toLocaleString()} đơn/tháng ...`);

    // Tắt synchronous_commit cho phiên này để ghi nhanh hơn (chỉ dùng khi seed)
    await client.query('SET synchronous_commit = off');

    for (const m of months) {
      const ym = m.toISOString().slice(0, 7);
      await client.query('SELECT ensure_orders_partition($1)', [m]);
      await client.query('BEGIN');
      // Đơn hàng
      await client.query(`
        INSERT INTO orders (customer_id, status, subtotal, shipping_fee, created_at)
        SELECT c.ids[1 + (random() * ($2::int - 1))::int],
               (ARRAY['completed','completed','completed','completed','shipping','confirmed','pending','cancelled'])[1 + (random()*7)::int],
               0, 30000,
               $1::timestamptz + random() * (($1::timestamptz + interval '1 month') - $1::timestamptz)
        FROM generate_series(1, $3::int), (SELECT array_agg(id ORDER BY id) AS ids FROM customers) c`, [m, customers, perMonth]);
      // Chi tiết: dòng 1 cho mọi đơn, dòng 2 cho 50% đơn
      await client.query(`
        WITH o AS (
          SELECT id, created_at FROM orders
          WHERE created_at >= $1::timestamptz AND created_at < $1::timestamptz + interval '1 month'
            AND subtotal = 0
        ),
        ins AS (
          INSERT INTO order_items (order_id, order_created_at, product_id, qty, unit_price)
          SELECT o.id, o.created_at, p.id, 1 + (random() < 0.2)::int, p.price
          FROM o, (SELECT array_agg(id ORDER BY id) AS ids FROM products) pa
          JOIN LATERAL (SELECT id, price FROM products WHERE id = pa.ids[1 + (o.id * 7919) % $2::int]) p ON true
          UNION ALL
          SELECT o.id, o.created_at, p.id, 1, p.price
          FROM o JOIN LATERAL (SELECT id, price FROM products WHERE id = 1 + (o.id * 104729) % 40) p ON true
          WHERE o.id % 2 = 0
          RETURNING order_id, order_created_at, line_total
        )
        UPDATE orders SET subtotal = s.sum, shipping_fee = CASE WHEN s.sum >= 5000000 THEN 0 ELSE 30000 END
        FROM (SELECT order_id, order_created_at, sum(line_total) AS sum FROM ins GROUP BY 1, 2) s
        WHERE orders.id = s.order_id AND orders.created_at = s.order_created_at`, [m, products]);
      await client.query('COMMIT');
      process.stdout.write(`  ${ym} ✓  (${((Date.now() - t0) / 1000).toFixed(0)}s)\r`);
    }
    console.log('\nANALYZE + refresh materialized view ...');
    await client.query('ANALYZE orders; ANALYZE order_items;');
    await client.query('SELECT refresh_sales_reports()');
    const { rows: [c] } = await client.query(`
      SELECT (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM order_items) AS items,
             (SELECT count(*) FROM pg_inherits WHERE inhparent = 'orders'::regclass) AS partitions,
             (SELECT pg_size_pretty(sum(pg_total_relation_size(inhrelid))) FROM pg_inherits WHERE inhparent = 'orders'::regclass) AS orders_size,
             pg_size_pretty(pg_total_relation_size('order_items')) AS items_size`);
    console.log(`✔ Xong trong ${((Date.now() - t0) / 1000).toFixed(0)}s:`, c);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
