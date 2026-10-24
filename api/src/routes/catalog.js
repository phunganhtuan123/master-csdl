// =====================================================================
// routes/catalog.js - API danh mục & sản phẩm cho trang bán hàng (public)
// =====================================================================
import { query, one } from '../db.js';

export default async function catalogRoutes(app) {

  // GET /api/categories  -> danh mục + số sản phẩm đang bán
  app.get('/api/categories', async () => {
    return query(`
      SELECT c.id, c.slug, c.name, c.parent_id,
             count(p.id) FILTER (WHERE p.status = 'active')::int AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id`);
  });

  // GET /api/products?category=nhan&metal=Vàng 18K&stone=Kim cương&min=1000000&max=50000000&sort=price_asc&page=1
  // Lọc thuộc tính bằng JSONB @> (dùng GIN index idx_products_attributes)
  app.get('/api/products', async (req) => {
    const { category, metal, stone, gender, min, max, sort = 'newest', page = 1, limit = 12, featured } = req.query;

    // Gom các thuộc tính lọc thành 1 object JSONB: {"metal":"Vàng 18K","stone":"Kim cương"}
    const attrFilter = {};
    if (metal)  attrFilter.metal  = metal;
    if (stone)  attrFilter.stone  = stone;
    if (gender) attrFilter.gender = gender;

    const where = [`p.status = 'active'`];
    const params = [];
    const add = (v) => { params.push(v); return `$${params.length}`; };

    if (category) where.push(`c.slug = ${add(category)}`);
    if (Object.keys(attrFilter).length) where.push(`p.attributes @> ${add(JSON.stringify(attrFilter))}::jsonb`);
    if (min) where.push(`p.price >= ${add(Number(min))}`);
    if (max) where.push(`p.price <= ${add(Number(max))}`);
    if (featured) where.push(`p.sku NOT LIKE 'GEN-%'`);   // trang chủ chỉ lấy sản phẩm thật

    const orderBy = {
      price_asc:  'p.price ASC',
      price_desc: 'p.price DESC',
      name:       'p.name ASC',
      newest:     'p.id DESC',
    }[sort] ?? 'p.id DESC';

    const lim = Math.min(Number(limit) || 12, 48);
    const off = (Math.max(Number(page) || 1, 1) - 1) * lim;

    // count(*) OVER() = tổng số dòng thoả điều kiện, lấy luôn trong 1 câu (không cần COUNT riêng)
    const rows = await query(`
      SELECT p.id, p.sku, p.slug, p.name, p.price, p.stock, p.image_url, p.attributes,
             c.name AS category, c.slug AS category_slug,
             count(*) OVER()::int AS total
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ${add(lim)} OFFSET ${add(off)}`, params);

    return { items: rows, total: rows[0]?.total ?? 0, page: Number(page), limit: lim };
  });

  // GET /api/products/filters -> giá trị để dựng bộ lọc (lấy từ JSONB bằng jsonb_object_keys / ->>)
  app.get('/api/products/filters', async () => {
    const [metals, stones] = await Promise.all([
      query(`SELECT attributes->>'metal' AS v, count(*)::int AS n FROM products
             WHERE status='active' AND attributes ? 'metal' GROUP BY 1 ORDER BY n DESC`),
      query(`SELECT attributes->>'stone' AS v, count(*)::int AS n FROM products
             WHERE status='active' AND attributes ? 'stone' GROUP BY 1 ORDER BY n DESC`),
    ]);
    return { metals, stones };
  });

  // GET /api/products/:slug -> chi tiết
  app.get('/api/products/:slug', async (req, reply) => {
    const p = await one(`
      SELECT p.*, c.name AS category, c.slug AS category_slug,
             coalesce((SELECT json_agg(url ORDER BY sort_order) FROM product_images WHERE product_id = p.id), '[]') AS images
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.slug = $1`, [req.params.slug]);
    if (!p) return reply.code(404).send({ error: 'Không tìm thấy sản phẩm' });
    delete p.embedding;   // vector 256 số, không cần trả về frontend
    delete p.search_vec;
    return p;
  });

  // GET /api/products/:slug/similar -> TÍNH NĂNG pgvector: sản phẩm tương tự
  // <=> là khoảng cách cosine; ORDER BY ... LIMIT dùng index HNSW (approximate nearest neighbor)
  app.get('/api/products/:slug/similar', async (req) => {
    return query(`
      SELECT p.id, p.slug, p.name, p.price, p.image_url, p.stock,
             round((1 - (p.embedding <=> me.embedding))::numeric, 3) AS similarity
      FROM products p,
           (SELECT embedding, id FROM products WHERE slug = $1) me
      WHERE p.id <> me.id AND p.status = 'active' AND p.embedding IS NOT NULL
      ORDER BY p.embedding <=> me.embedding
      LIMIT 8`, [req.params.slug]);
  });
}
