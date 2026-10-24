// =====================================================================
// routes/search.js - TÍNH NĂNG Full-text search tiếng Việt + tìm gần đúng (trigram)
// =====================================================================
// Chiến lược 2 tầng:
//   1. Full-text search: search_vec @@ plainto_tsquery(...)  -> chính xác, xếp hạng ts_rank
//      "nhan kim cuong 18k" (không dấu) vẫn khớp "Nhẫn kim cương 18K" nhờ vi_unaccent()
//   2. Nếu tầng 1 không có kết quả (gõ sai chính tả: "nhan kim cuog") -> trigram similarity
//      vi_unaccent(name) % $q   -> dùng GIN gin_trgm_ops
// Cả 2 tầng đều chạy trên index, không quét bảng.
// =====================================================================
import { query } from '../db.js';

export default async function searchRoutes(app) {

  // GET /api/search?q=nhẫn kim cương
  app.get('/api/search', async (req) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return { mode: 'none', items: [] };

    // Tầng 1: full-text search
    const fts = await query(`
      SELECT p.id, p.slug, p.name, p.price, p.image_url, p.stock, c.name AS category,
             ts_rank(p.search_vec, q) AS rank,
             ts_headline('simple', p.name, q, 'StartSel=<b>, StopSel=</b>') AS headline
      FROM products p
      JOIN categories c ON c.id = p.category_id,
           plainto_tsquery('simple', vi_unaccent($1)) q
      WHERE p.status = 'active' AND p.search_vec @@ q
      ORDER BY rank DESC, p.sku NOT LIKE 'GEN-%' DESC, p.id
      LIMIT 24`, [q]);
    if (fts.length) return { mode: 'fulltext', items: fts };

    // Tầng 2: tìm gần đúng bằng trigram (chịu được lỗi chính tả)
    const fuzzy = await query(`
      SELECT p.id, p.slug, p.name, p.price, p.image_url, p.stock, c.name AS category,
             similarity(vi_unaccent(p.name), vi_unaccent($1)) AS rank
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND vi_unaccent(p.name) % vi_unaccent($1)
      ORDER BY rank DESC
      LIMIT 24`, [q]);
    return { mode: 'fuzzy', items: fuzzy };
  });

  // GET /api/search/suggest?q=nha  -> gợi ý khi gõ (prefix search bằng to_tsquery 'nha:*')
  app.get('/api/search/suggest', async (req) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return [];
    // Mỗi từ thêm :* để khớp tiền tố: "nhan kim" -> 'nhan:* & kim:*'
    const tsq = q.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean)
                 .map((w) => `${w}:*`).join(' & ');
    if (!tsq) return [];
    return query(`
      SELECT slug, name, price, image_url
      FROM products
      WHERE status = 'active' AND search_vec @@ to_tsquery('simple', vi_unaccent($1))
      ORDER BY sku NOT LIKE 'GEN-%' DESC, ts_rank(search_vec, to_tsquery('simple', vi_unaccent($1))) DESC
      LIMIT 6`, [tsq]);
  });
}
