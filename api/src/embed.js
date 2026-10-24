// =====================================================================
// embed.js - Tính embedding cho tất cả sản phẩm chưa có vector, ghi vào cột products.embedding
// Chạy: npm run embed   (chạy lại sau khi seed hoặc thêm sản phẩm hàng loạt)
// =====================================================================
import { pool } from './db.js';
import { embedProduct, toPgVector } from './embedding.js';

async function main() {
  const { rows } = await pool.query(`
    SELECT p.id, p.name, p.description, p.attributes, c.name AS category
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.embedding IS NULL`);

  console.log(`Tính embedding cho ${rows.length} sản phẩm...`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of rows) {
      await client.query('UPDATE products SET embedding = $1::vector WHERE id = $2',
        [toPgVector(embedProduct(p)), p.id]);
    }
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  console.log('✔ Xong');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
