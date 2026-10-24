# Hệ thống bán hàng trang sức với PostgreSQL

Tiểu luận môn **Cơ sở dữ liệu** — Nhóm 6: Phùng Anh Tuấn (2541864024), Võ Bùi Duy Thông (2541864019)

Ứng dụng bán trang sức (khách hàng + quản trị) xây dựng trên **PostgreSQL 16**, backend **Node.js + Fastify + SQL thuần** (không ORM), frontend **Next.js 15**. Mục tiêu: demo 6 tính năng nổi bật của PostgreSQL gắn với nghiệp vụ thật.

| # | Tính năng PostgreSQL | Nghiệp vụ | File |
|---|---|---|---|
| 1 | **JSONB + GIN** | Thuộc tính sản phẩm linh hoạt (ni nhẫn, carat, chiều dài dây…), lọc `@>` | `db/migrations/002`, `004`, `api/src/routes/catalog.js` |
| 2 | **Full-text search tiếng Việt** (`unaccent` + `tsvector` + `pg_trgm`) | Tìm không dấu, gõ sai chính tả vẫn ra | `001`, `002`, `004`, `api/src/routes/search.js` |
| 3 | **pgvector + HNSW** | Gợi ý sản phẩm tương tự | `002`, `004`, `api/src/embedding.js`, `catalog.js` |
| 4 | **Partitioning + BRIN** | Bảng đơn hàng chia theo tháng, báo cáo theo khoảng ngày | `003`, `004` |
| 5 | **Transaction + `SELECT … FOR UPDATE`** | Chống bán quá kho khi nhiều người đặt cùng lúc | `005`, `api/src/routes/orders.js` |
| 6 | **Materialized View + LISTEN/NOTIFY** | Dashboard tính sẵn; cảnh báo sắp hết hàng real-time qua SSE | `006`, `005`, `api/src/routes/events.js` |

Ngoài ra: partial index, covering index (INCLUDE), expression index, generated column, `pg_stat_statements`, `pgbench`, Grafana.

## Cấu trúc

```
db/migrations/      001..006 — SQL thuần, chạy theo thứ tự (migration runner tự viết)
db/seed/seed.sql    dữ liệu mẫu: 40 sản phẩm thật + 3.000 sinh tự động, 500 khách, 30.000 đơn
db/benchmark/       EXPLAIN ANALYZE trước/sau index, pgbench, kiểm chứng chống bán quá kho
api/                Node.js + Fastify + pg  (port 4000)
web/                Next.js — trang bán hàng (/) và quản trị (/admin)  (port 3000)
monitoring/         Grafana datasource + dashboard tự động nạp (port 3001)
docs/               tiểu luận, slide, screenshots
```

## Chạy bằng Docker (nhanh nhất)

```bash
docker compose up -d --build
# Web:      http://localhost:3000        Admin: http://localhost:3000/admin  (admin / admin123)
# API:      http://localhost:4000/api/health
# Grafana:  http://localhost:3001        (admin / admin, dashboard "Jewelry Shop - PostgreSQL Monitor")
# Postgres: localhost:5432  postgres / postgres  db: jewelry
```
Lần đầu container `api` tự chạy `migrate → seed → embed` (~20 giây) rồi mới mở cổng.

## Chạy thủ công (dev)

Cần PostgreSQL 16 có extension `vector` (cài `pgvector`) và `pg_stat_statements` trong `shared_preload_libraries`.

```bash
# 1. Backend
cd api && cp .env.example .env     # sửa DATABASE_URL
npm install
npm run migrate                    # chạy db/migrations/*.sql chưa áp dụng
npm run seed                       # nạp dữ liệu mẫu + đặt mật khẩu admin
npm run embed                      # tính embedding pgvector cho sản phẩm
npm run dev                        # http://localhost:4000

# 2. Frontend
cd web && npm install && npm run dev   # http://localhost:3000

# Làm lại DB từ đầu
cd api && npm run reset
```

## Benchmark

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/jewelry
bash db/benchmark/run_bench.sh explain    # EXPLAIN ANALYZE có/không index -> db/benchmark/results/explain.txt
bash db/benchmark/run_bench.sh oversell   # 50 client mua 5 chiếc cuối -> đúng 5 đơn thành công
bash db/benchmark/run_bench.sh order      # pgbench 50 client đặt hàng đồng thời (TPS)
bash db/benchmark/run_bench.sh search     # pgbench tải đọc: FTS + JSONB + vector
```
Trang **Admin → Monitor & Benchmark** chạy EXPLAIN ANALYZE ngay trên giao diện và so sánh có/không index.

## API chính

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/products?category=&metal=&stone=&min=&max=&sort=&page=` | Danh sách, lọc JSONB `@>` |
| GET | `/api/products/:slug` · `/similar` | Chi tiết · gợi ý pgvector |
| GET | `/api/search?q=` · `/api/search/suggest?q=` | Full-text → trigram · gợi ý prefix |
| POST | `/api/orders` | Đặt hàng → `place_order()` (transaction + FOR UPDATE) |
| GET | `/api/orders/:id?phone=` | Khách tra cứu đơn |
| POST | `/api/admin/login` | JWT |
| GET | `/api/admin/dashboard` · POST `/reports/refresh` | Materialized view |
| GET/POST/PUT | `/api/admin/products…` · POST `/:id/stock` | CRUD + nhập kho |
| GET/PATCH | `/api/admin/orders…` `/status` | Duyệt / huỷ (`cancel_order()`) |
| GET | `/api/admin/events?token=` | SSE từ LISTEN/NOTIFY |
| GET | `/api/admin/monitor/overview` · `/statements` · `/explain/:key` | Monitor & benchmark |
