// =====================================================================
// routes/admin.js - API quản trị (cần JWT): sản phẩm, đơn hàng, dashboard
// =====================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, one, tx } from '../db.js';
import { embedProduct, toPgVector } from '../embedding.js';

const JWT_SECRET = process.env.JWT_SECRET || 'doi-secret-nay-khi-deploy';

/** Hook kiểm tra token: Authorization: Bearer <jwt> */
export async function requireAdmin(req, reply) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
  } catch {
    return reply.code(401).send({ error: 'Chưa đăng nhập' });
  }
}

/** Tạo slug từ tên: "Nhẫn Kim Cương 18K" -> "nhan-kim-cuong-18k" */
function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function adminRoutes(app) {

  // ---------------- Đăng nhập ----------------
  app.post('/api/admin/login', async (req, reply) => {
    const { username, password } = req.body ?? {};
    const admin = await one('SELECT id, username, password_hash, full_name FROM admins WHERE username = $1', [username]);
    if (!admin || !(await bcrypt.compare(password ?? '', admin.password_hash))) {
      return reply.code(401).send({ error: 'Sai tài khoản hoặc mật khẩu' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
    return { token, admin: { id: admin.id, username: admin.username, full_name: admin.full_name } };
  });

  // Mọi route bên dưới đều cần đăng nhập
  app.register(async (priv) => {
    priv.addHook('preHandler', requireAdmin);

    // ---------------- Dashboard: materialized view + partial index ----------------
    priv.get('/api/admin/dashboard', async () => {
      const [today, daily, top, byCategory, lowStock, pendingCount, refreshedAt] = await Promise.all([
        // Hôm nay: tính trực tiếp (real-time) - bảng partition tháng này nhỏ
        one(`SELECT count(*)::int AS orders, coalesce(sum(total),0) AS revenue
             FROM orders WHERE created_at >= current_date AND status <> 'cancelled'`),
        // 30 ngày gần nhất: lấy từ materialized view (tính sẵn)
        query(`SELECT day, orders, revenue, items_sold FROM mv_sales_daily
               WHERE day >= current_date - 30 ORDER BY day`),
        query(`SELECT * FROM mv_top_products LIMIT 10`),
        query(`SELECT month, category, revenue, qty FROM mv_sales_by_category_month
               WHERE month >= date_trunc('month', current_date) - interval '5 months' ORDER BY month, category`),
        // Sắp hết hàng: view trên partial index idx_products_low_stock
        query(`SELECT * FROM v_low_stock_products LIMIT 20`),
        one(`SELECT count(*)::int AS n FROM orders WHERE status IN ('pending','confirmed')`),  // partial index idx_orders_pending
        one(`SELECT max(day) AS last_day FROM mv_sales_daily`),
      ]);
      return { today, daily, top, byCategory, lowStock, pending: pendingCount.n, reports_last_day: refreshedAt.last_day };
    });

    // Làm mới materialized view (REFRESH ... CONCURRENTLY, không chặn người đọc)
    priv.post('/api/admin/reports/refresh', async () => {
      const t0 = Date.now();
      await query('SELECT refresh_sales_reports()');
      return { ok: true, ms: Date.now() - t0 };
    });

    // ---------------- Sản phẩm ----------------
    priv.get('/api/admin/products', async (req) => {
      const { q = '', page = 1, limit = 20, status } = req.query;
      const params = [];
      const add = (v) => { params.push(v); return `$${params.length}`; };
      const where = ['true'];
      if (status) where.push(`p.status = ${add(status)}`);
      if (q) where.push(`(vi_unaccent(p.name) ILIKE ${add('%' + q + '%')} OR p.sku ILIKE ${add('%' + q + '%')})`);
      const lim = Math.min(Number(limit) || 20, 100);
      const off = (Math.max(Number(page) || 1, 1) - 1) * lim;
      const rows = await query(`
        SELECT p.id, p.sku, p.slug, p.name, p.price, p.stock, p.status, p.image_url, p.attributes, p.updated_at,
               c.name AS category, c.id AS category_id, count(*) OVER()::int AS total
        FROM products p JOIN categories c ON c.id = p.category_id
        WHERE ${where.join(' AND ')}
        ORDER BY p.sku NOT LIKE 'GEN-%' DESC, p.id DESC
        LIMIT ${add(lim)} OFFSET ${add(off)}`, params);
      return { items: rows, total: rows[0]?.total ?? 0 };
    });

    priv.get('/api/admin/products/:id', async (req, reply) => {
      const p = await one(`SELECT id, sku, slug, name, category_id, price, stock, attributes, description, image_url, status
                           FROM products WHERE id = $1`, [Number(req.params.id)]);
      if (!p) return reply.code(404).send({ error: 'Không tìm thấy' });
      p.movements = await query(`SELECT delta, reason, ref_id, created_at FROM stock_movements
                                 WHERE product_id = $1 ORDER BY created_at DESC LIMIT 20`, [p.id]);
      return p;
    });

    // Tạo sản phẩm: INSERT + tính embedding trong cùng transaction
    priv.post('/api/admin/products', async (req, reply) => {
      const b = req.body ?? {};
      if (!b.name || !b.sku || !b.category_id || b.price == null) {
        return reply.code(400).send({ error: 'Thiếu tên / mã / danh mục / giá' });
      }
      const cat = await one('SELECT name FROM categories WHERE id = $1', [Number(b.category_id)]);
      const embedding = toPgVector(embedProduct({ ...b, category: cat?.name }));
      const row = await one(`
        INSERT INTO products (sku, slug, name, category_id, price, stock, attributes, description, image_url, status, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::vector)
        RETURNING id, slug`,
        [b.sku, b.slug || slugify(b.name) + '-' + Date.now().toString(36), b.name, Number(b.category_id),
         Number(b.price), Number(b.stock) || 0, JSON.stringify(b.attributes ?? {}), b.description ?? null,
         b.image_url ?? null, b.status ?? 'active', embedding]);
      return reply.code(201).send(row);
    });

    // Sửa sản phẩm (search_vec tự cập nhật vì là generated column; embedding tính lại)
    priv.put('/api/admin/products/:id', async (req, reply) => {
      const id = Number(req.params.id);
      const b = req.body ?? {};
      const cat = await one('SELECT name FROM categories WHERE id = $1', [Number(b.category_id)]);
      const embedding = toPgVector(embedProduct({ ...b, category: cat?.name }));
      const row = await one(`
        UPDATE products SET
          name = $2, category_id = $3, price = $4, attributes = $5::jsonb,
          description = $6, image_url = $7, status = $8, embedding = $9::vector
        WHERE id = $1
        RETURNING id, slug`,
        [id, b.name, Number(b.category_id), Number(b.price), JSON.stringify(b.attributes ?? {}),
         b.description ?? null, b.image_url ?? null, b.status ?? 'active', embedding]);
      if (!row) return reply.code(404).send({ error: 'Không tìm thấy' });
      return row;
    });

    // Nhập kho / điều chỉnh tồn: cập nhật stock + ghi stock_movements trong 1 transaction
    priv.post('/api/admin/products/:id/stock', async (req, reply) => {
      const id = Number(req.params.id);
      const delta = Number(req.body?.delta);
      if (!delta) return reply.code(400).send({ error: 'delta phải khác 0' });
      return tx(async (c) => {
        const { rows } = await c.query('UPDATE products SET stock = stock + $2 WHERE id = $1 RETURNING stock', [id, delta]);
        await c.query('INSERT INTO stock_movements (product_id, delta, reason) VALUES ($1, $2, $3)',
          [id, delta, delta > 0 ? 'import' : 'adjust']);
        return { stock: rows[0].stock };
      });
    });

    // ---------------- Đơn hàng ----------------
    priv.get('/api/admin/orders', async (req) => {
      const { status, q = '', page = 1, limit = 20, from, to } = req.query;
      const params = [];
      const add = (v) => { params.push(v); return `$${params.length}`; };
      const where = ['true'];
      if (status) where.push(`status = ${add(status)}`);
      if (q) where.push(`(customer_phone LIKE ${add('%' + q + '%')} OR customer_name ILIKE ${add('%' + q + '%')} OR id::text = ${add(q)})`);
      // Lọc theo khoảng ngày -> partition pruning + BRIN
      if (from) where.push(`created_at >= ${add(from)}`);
      if (to)   where.push(`created_at < ${add(to)}::date + 1`);
      const lim = Math.min(Number(limit) || 20, 100);
      const off = (Math.max(Number(page) || 1, 1) - 1) * lim;
      const rows = await query(`
        SELECT *, count(*) OVER()::int AS total_rows FROM v_order_summary
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT ${add(lim)} OFFSET ${add(off)}`, params);
      return { items: rows, total: rows[0]?.total_rows ?? 0 };
    });

    priv.get('/api/admin/orders/:id', async (req, reply) => {
      const o = await one('SELECT * FROM v_order_summary WHERE id = $1', [Number(req.params.id)]);
      if (!o) return reply.code(404).send({ error: 'Không tìm thấy' });
      o.items = await query(`
        SELECT oi.product_id, p.name, p.sku, p.image_url, oi.qty, oi.unit_price, oi.line_total
        FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`, [o.id]);
      return o;
    });

    // Đổi trạng thái; huỷ -> gọi cancel_order() để trả kho trong transaction
    priv.patch('/api/admin/orders/:id/status', async (req, reply) => {
      const id = Number(req.params.id);
      const status = req.body?.status;
      if (status === 'cancelled') {
        try {
          await query('SELECT cancel_order($1)', [id]);
        } catch (err) {
          return reply.code(409).send({ error: err.message.replace(/^\w+:\s*/, '') });
        }
      } else {
        const ok = await one(`UPDATE orders SET status = $2 WHERE id = $1
                              AND $2 IN ('confirmed','shipping','completed') RETURNING id`, [id, status]);
        if (!ok) return reply.code(400).send({ error: 'Trạng thái không hợp lệ' });
      }
      return { ok: true };
    });

    priv.get('/api/admin/categories', async () => query('SELECT id, slug, name, parent_id FROM categories ORDER BY id'));
  });
}
