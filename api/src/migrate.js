// =====================================================================
// migrate.js - Trình chạy migration tự viết (~60 dòng, không cần thư viện)
// =====================================================================
// Cách hoạt động:
//   1. Tạo bảng schema_migrations (nếu chưa có) để ghi nhớ file nào đã chạy
//   2. Đọc thư mục db/migrations, sắp xếp theo tên (001_, 002_, ...)
//   3. File nào chưa có trong schema_migrations -> chạy trong 1 transaction rồi ghi lại
// Chạy:  npm run migrate           (chạy các file mới)
//        npm run migrate -- --reset (xoá sạch schema public rồi chạy lại từ đầu - chỉ dùng khi dev)
// =====================================================================
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../db/migrations');

async function main() {
  const reset = process.argv.includes('--reset');
  const client = await pool.connect();
  try {
    if (reset) {
      console.log('⚠  --reset: xoá toàn bộ schema public');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`→ ${file} ... `);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('OK');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('LỖI');
        throw err;
      }
    }
    console.log(count ? `✔ Đã chạy ${count} migration` : '✔ Không có migration mới');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
