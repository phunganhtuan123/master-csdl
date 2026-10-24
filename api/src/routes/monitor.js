// =====================================================================
// routes/monitor.js - Giám sát PostgreSQL ngay trong trang admin (không cần tool ngoài)
// =====================================================================
//  * pg_stat_statements : câu SQL nào chạy nhiều nhất / tốn thời gian nhất
//  * pg_stat_user_indexes: index nào được dùng, index nào vô dụng (idx_scan = 0)
//  * pg_relation_size    : dung lượng bảng / index / partition
//  * EXPLAIN ANALYZE     : chạy các truy vấn demo có/không dùng index để so sánh
// =====================================================================
import { query } from '../db.js';
import { requireAdmin } from './admin.js';

// Các truy vấn demo cho trang "Benchmark" (whitelist, không cho chạy SQL tuỳ ý)
export const DEMO_QUERIES = {
  jsonb_gin: {
    title: 'JSONB @> với GIN index',
    sql: `SELECT count(*) FROM products WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}'`,
    off: 'enable_bitmapscan',
  },
  fts_gin: {
    title: 'Full-text search tiếng Việt (GIN tsvector)',
    sql: `SELECT name FROM products WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn kim cương 18k')) LIMIT 20`,
    off: 'enable_bitmapscan',
  },
  trgm: {
    title: 'Tìm gần đúng bằng trigram (gõ sai chính tả)',
    sql: `SELECT name FROM products WHERE vi_unaccent(name) % 'nhan kim cuog solitare' LIMIT 10`,
    off: 'enable_bitmapscan',
  },
  vector_hnsw: {
    title: 'pgvector: 8 sản phẩm gần nhất (HNSW)',
    sql: `SELECT name FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku='NK-001') LIMIT 8`,
    off: 'enable_indexscan',
  },
  partition_brin: {
    title: 'Partition pruning + BRIN theo khoảng ngày',
    sql: `SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-10-01' AND created_at < '2026-10-15'`,
    off: 'enable_partition_pruning',
  },
  covering: {
    title: 'Covering index (INCLUDE) -> Index Only Scan',
    sql: `SELECT id, status, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20`,
    off: 'enable_indexonlyscan',
  },
  partial: {
    title: 'Partial index: sản phẩm sắp hết hàng',
    sql: `SELECT id, name, stock FROM products WHERE stock < 3 AND status = 'active' ORDER BY stock LIMIT 20`,
    off: 'enable_indexscan',
  },
  matview: {
    title: 'Materialized view vs tính trực tiếp (doanh thu theo ngày)',
    sql: `SELECT day, revenue FROM mv_sales_daily WHERE day >= current_date - 30 ORDER BY day`,
    compare: `SELECT date_trunc('day', o.created_at)::date AS day, sum(o.total) AS revenue
              FROM orders o WHERE o.created_at >= current_date - 30 AND o.status <> 'cancelled' GROUP BY 1 ORDER BY 1`,
  },
};

export default async function monitorRoutes(app) {
  app.register(async (priv) => {
    priv.addHook('preHandler', requireAdmin);

    // Tổng quan
    priv.get('/api/admin/monitor/overview', async () => {
      const [version, dbSize, tables, indexes, partitions, activity] = await Promise.all([
        query(`SELECT version()`),
        query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`),
        query(`
          SELECT relname AS table, n_live_tup::int AS rows,
                 pg_size_pretty(pg_table_size(relid)) AS table_size,
                 pg_size_pretty(pg_indexes_size(relid)) AS index_size,
                 seq_scan::int, idx_scan::int, n_tup_ins::int AS inserts, n_tup_upd::int AS updates
          FROM pg_stat_user_tables
          WHERE relname NOT LIKE 'orders_20%' AND relname <> 'orders_default'
          ORDER BY pg_total_relation_size(relid) DESC`),
        query(`
          SELECT i.indexrelname AS index, i.relname AS table, am.amname AS type,
                 pg_size_pretty(pg_relation_size(i.indexrelid)) AS size,
                 i.idx_scan::int AS scans
          FROM pg_stat_user_indexes i
          JOIN pg_class c ON c.oid = i.indexrelid
          JOIN pg_am am ON am.oid = c.relam
          WHERE i.relname NOT LIKE 'orders_20%' AND i.relname <> 'orders_default'
          ORDER BY i.relname, i.indexrelname`),
        query(`
          SELECT c.relname AS partition, pg_size_pretty(pg_relation_size(c.oid)) AS size,
                 s.n_live_tup::int AS rows, pg_get_expr(c.relpartbound, c.oid) AS range
          FROM pg_inherits h
          JOIN pg_class c ON c.oid = h.inhrelid
          JOIN pg_stat_user_tables s ON s.relid = c.oid
          WHERE h.inhparent = 'orders'::regclass
          ORDER BY c.relname`),
        query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE state = 'active')::int AS active
               FROM pg_stat_activity WHERE datname = current_database()`),
      ]);
      return { version: version[0].version, db_size: dbSize[0].size, tables, indexes, partitions, connections: activity[0] };
    });

    // Top câu SQL theo pg_stat_statements
    priv.get('/api/admin/monitor/statements', async (req) => {
      const order = req.query.order === 'calls' ? 'calls DESC' : 'total_exec_time DESC';
      return query(`
        SELECT left(query, 300) AS query, calls::int,
               round(total_exec_time::numeric, 1) AS total_ms,
               round(mean_exec_time::numeric, 3)  AS mean_ms,
               rows::int,
               round((100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0))::numeric, 1) AS cache_hit_pct
        FROM pg_stat_statements
        WHERE query NOT ILIKE '%pg_stat%' AND query NOT ILIKE 'BEGIN%' AND query NOT ILIKE 'COMMIT%'
        ORDER BY ${order}
        LIMIT 25`);
    });

    priv.post('/api/admin/monitor/statements/reset', async () => {
      await query('SELECT pg_stat_statements_reset()');
      return { ok: true };
    });

    // Danh sách truy vấn demo
    priv.get('/api/admin/monitor/demos', async () =>
      Object.entries(DEMO_QUERIES).map(([key, d]) => ({ key, title: d.title, sql: d.sql, compare: d.compare ?? null })));

    // EXPLAIN ANALYZE 1 truy vấn demo, 2 lần: có index và tắt index (SET LOCAL enable_xxx = off)
    priv.get('/api/admin/monitor/explain/:key', async (req, reply) => {
      const d = DEMO_QUERIES[req.params.key];
      if (!d) return reply.code(404).send({ error: 'Không có truy vấn này' });

      const explain = async (sql, offSetting) => {
        const client = await (await import('../db.js')).pool.connect();
        try {
          await client.query('BEGIN');
          if (offSetting) await client.query(`SET LOCAL ${offSetting} = off`);
          // Lặp 3 lần lấy lần nhanh nhất để loại bỏ ảnh hưởng cache lạnh
          let best = null;
          for (let i = 0; i < 3; i++) {
            const { rows } = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
            const plan = rows[0]['QUERY PLAN'][0];
            if (!best || plan['Execution Time'] < best['Execution Time']) best = plan;
          }
          const { rows: text } = await client.query(`EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) ${sql}`);
          await client.query('ROLLBACK');
          return { execution_ms: best['Execution Time'], planning_ms: best['Planning Time'],
                   plan_text: text.map((r) => r['QUERY PLAN']).join('\n') };
        } finally { client.release(); }
      };

      const withIndex = await explain(d.sql, null);
      const without = d.compare ? await explain(d.compare, null) : await explain(d.sql, d.off);
      return { title: d.title, sql: d.sql, with_index: withIndex,
               without_index: { ...without, label: d.compare ? 'Tính trực tiếp' : `SET ${d.off} = off` } };
    });
  });
}
