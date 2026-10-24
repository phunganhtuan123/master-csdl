// =====================================================================
// server.js - Khởi động API (Fastify)
// =====================================================================
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db.js';
import catalogRoutes from './routes/catalog.js';
import searchRoutes from './routes/search.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import monitorRoutes from './routes/monitor.js';
import eventRoutes, { startListener } from './routes/events.js';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

await app.register(cors, { origin: true });

app.get('/api/health', async () => {
  const { rows } = await pool.query('SELECT now() AS db_time, current_database() AS db');
  return { ok: true, ...rows[0] };
});

await app.register(catalogRoutes);
await app.register(searchRoutes);
await app.register(orderRoutes);
await app.register(adminRoutes);
await app.register(monitorRoutes);
await app.register(eventRoutes);

// Lỗi chưa bắt -> 500 kèm message (dev) để dễ debug
app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  reply.code(err.statusCode || 500).send({ error: err.message });
});

const port = Number(process.env.PORT) || 4000;
await startListener();
await app.listen({ port, host: '0.0.0.0' });
