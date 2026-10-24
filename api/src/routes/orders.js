// =====================================================================
// routes/orders.js - Đặt hàng (public)
// =====================================================================
// Toàn bộ logic đặt hàng nằm trong hàm PL/pgSQL place_order() (db/migrations/005):
// transaction + SELECT FOR UPDATE chống bán quá kho. Backend chỉ gọi 1 câu SQL.
// =====================================================================
import { query, one } from '../db.js';

export default async function orderRoutes(app) {

  // POST /api/orders
  // body: { customer: {full_name, phone, email, address}, items: [{product_id, qty}], note }
  app.post('/api/orders', async (req, reply) => {
    const { customer, items, note } = req.body ?? {};
    if (!customer?.full_name || !customer?.phone) {
      return reply.code(400).send({ error: 'Thiếu họ tên hoặc số điện thoại' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: 'Giỏ hàng trống' });
    }
    const cleanItems = items.map((i) => ({ product_id: Number(i.product_id), qty: Math.max(1, Number(i.qty) || 1) }));

    try {
      const row = await one(
        'SELECT * FROM place_order($1::jsonb, $2::jsonb, $3)',
        [JSON.stringify(customer), JSON.stringify(cleanItems), note ?? null]);
      return { order_id: row.order_id, total: row.order_total };
    } catch (err) {
      // RAISE EXCEPTION trong PL/pgSQL -> err.message = 'OUT_OF_STOCK: ...'
      if (/^(OUT_OF_STOCK|EMPTY_ORDER)/.test(err.message)) {
        return reply.code(409).send({ error: err.message.replace(/^\w+:\s*/, '') });
      }
      throw err;
    }
  });

  // GET /api/orders/:id?phone=09xxx -> khách tra cứu đơn bằng mã đơn + SĐT
  app.get('/api/orders/:id', async (req, reply) => {
    const o = await one(`
      SELECT * FROM v_order_summary WHERE id = $1 AND customer_phone = $2`,
      [Number(req.params.id), String(req.query.phone ?? '')]);
    if (!o) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
    o.items = await query(`
      SELECT oi.product_id, p.name, p.slug, p.image_url, oi.qty, oi.unit_price, oi.line_total
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1 ORDER BY oi.id`, [o.id]);
    return o;
  });
}
