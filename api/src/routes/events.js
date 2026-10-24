// =====================================================================
// routes/events.js - TÍNH NĂNG LISTEN / NOTIFY -> Server-Sent Events cho admin
// =====================================================================
// 1 kết nối riêng (không lấy từ pool) chạy LISTEN low_stock, new_order.
// Khi trigger trong DB gọi pg_notify(...), pg phát sự kiện 'notification',
// server đẩy xuống tất cả trình duyệt admin đang mở qua SSE (text/event-stream).
// Admin không cần F5, không cần polling, không cần Redis.
// =====================================================================
import pg from 'pg';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'doi-secret-nay-khi-deploy';
const subscribers = new Set();   // các response SSE đang mở

export async function startListener() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/jewelry',
  });
  await client.connect();
  await client.query('LISTEN low_stock');
  await client.query('LISTEN new_order');

  client.on('notification', (msg) => {
    const data = `event: ${msg.channel}\ndata: ${msg.payload}\n\n`;
    for (const res of subscribers) res.write(data);
  });
  client.on('error', (err) => console.error('LISTEN connection error:', err.message));
  console.log('✔ LISTEN low_stock, new_order');
  return client;
}

export default async function eventRoutes(app) {
  // GET /api/admin/events?token=<jwt>  (EventSource không gửi được header Authorization)
  app.get('/api/admin/events', async (req, reply) => {
    try { jwt.verify(req.query.token, JWT_SECRET); }
    catch { return reply.code(401).send({ error: 'Chưa đăng nhập' }); }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    reply.raw.write(`event: hello\ndata: {"ok":true}\n\n`);
    subscribers.add(reply.raw);

    // Giữ kết nối sống
    const ping = setInterval(() => reply.raw.write(': ping\n\n'), 25000);
    req.raw.on('close', () => { clearInterval(ping); subscribers.delete(reply.raw); });
    return reply;   // không gửi body khác, stream tự xử lý
  });
}
