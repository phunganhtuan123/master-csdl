// =====================================================================
// seed.js - Nạp dữ liệu mẫu từ db/seed/seed.sql + đặt mật khẩu admin
// Chạy: npm run seed
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, '../../db/seed/seed.sql');

async function main() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM products');
  if (rows[0].n > 0) {
    console.log('Đã có dữ liệu, bỏ qua seed. Dùng `npm run reset` để làm lại từ đầu.');
    await pool.end();
    return;
  }

  console.log('Nạp seed.sql ...');
  await pool.query(fs.readFileSync(SEED_FILE, 'utf8'));

  // Mật khẩu admin lấy từ env (mặc định admin123), hash bằng bcrypt
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE admins SET password_hash = $1 WHERE username = $2', [hash, 'admin']);

  console.log(`✔ Seed xong. Đăng nhập admin: admin / ${password}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
