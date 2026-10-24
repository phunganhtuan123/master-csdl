// =====================================================================
// db.js - Kết nối PostgreSQL bằng thư viện `pg` (node-postgres), SQL thuần
// =====================================================================
// Không dùng ORM: mọi truy vấn là chuỗi SQL + mảng tham số ($1, $2, ...)
//   await query('SELECT * FROM products WHERE id = $1', [id])
// Tham số hoá ($1) để chống SQL injection, pg tự escape giá trị.
// =====================================================================
import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// NUMERIC (giá tiền) mặc định pg trả về string để không mất độ chính xác.
// Giá VNĐ không có số lẻ -> ép sang Number cho frontend dùng thẳng.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// BIGINT (id) cũng về string -> ép Number (id < 2^53 an toàn)
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/jewelry',
  max: 10,                 // tối đa 10 kết nối trong pool
  idleTimeoutMillis: 30000,
});

/** Chạy 1 câu SQL, trả về mảng rows */
export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

/** Lấy 1 dòng (hoặc null) */
export async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/**
 * Chạy nhiều câu SQL trong 1 transaction.
 * Dùng: await tx(async (client) => { await client.query(...); await client.query(...); })
 * Nếu callback ném lỗi -> ROLLBACK, ngược lại COMMIT.
 */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
