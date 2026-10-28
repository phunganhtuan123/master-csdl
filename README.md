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

Ngoài ra: partial index, covering index (INCLUDE), expression index, generated column, `pg_stat_statements`, `pgbench`, trang Monitor & Benchmark trong admin, tool đo `npm run bench`.

## Cấu trúc

```
db/migrations/      001..006 — SQL thuần, chạy theo thứ tự (migration runner tự viết)
db/seed/seed.sql    dữ liệu mẫu: 40 sản phẩm thật + 3.000 sinh tự động, 500 khách, 30.000 đơn
api/src/seed-big.js 1 triệu đơn hàng để test partition/index · api/src/bench.js công cụ đo
db/demo/            demo_queries.sql — câu lệnh demo mở trong DBeaver
db/benchmark/       pgbench: đặt hàng đồng thời, kiểm chứng chống bán quá kho
api/                Node.js + Fastify + pg  (port 4000)
web/                Next.js — trang bán hàng (/) và quản trị (/admin)  (port 3000)
docs/               tiểu luận, slide, screenshots
```

## Chạy trên máy cá nhân (chỉ cần Docker Desktop)

```bash
git clone https://github.com/phunganhtuan123/master-csdl.git
cd master-csdl
docker compose up -d --build        # lần đầu 2-3 phút: build image → migrate → seed → embed
docker compose logs -f api          # thấy dòng "LISTEN low_stock, new_order" là xong (Ctrl+C để thoát log)
```
| Địa chỉ | Dùng để |
|---|---|
| http://localhost:3000 | Trang bán hàng |
| http://localhost:3000/admin  (admin / admin123) | Quản trị · Monitor & Benchmark |
| localhost:5432 · db `jewelry` · user `postgres` · pass `postgres` | Kết nối DBeaver / psql |

```bash
docker compose exec api npm run seed:big   # (tuỳ chọn) thêm 1 triệu đơn hàng, ~2 phút
docker compose exec api npm run bench      # công cụ đo, in bảng + ghi docs/benchmark/bench-report.md
docker compose down                        # tắt (giữ dữ liệu)   |   docker compose down -v  xoá sạch
```

## Query bằng DBeaver (để demo cho giảng viên)

1. DBeaver → **Database → New Database Connection → PostgreSQL** → Host `localhost`, Port `5432`, Database `jewelry`, Username `postgres`, Password `postgres` → **Test Connection** → Finish.
2. **File → Open File** → chọn `db/demo/demo_queries.sql`, gắn với connection vừa tạo.
3. Đặt con trỏ vào từng khối lệnh, bấm **Ctrl+Enter** (Mac: **Cmd+Enter**). File có 8 mục đánh số trùng với chương 3 tiểu luận: tổng quan → JSONB → full-text → pgvector → partition → transaction chống bán quá kho (có hướng dẫn mở 2 tab để thấy giao dịch bị chờ) → materialized view/NOTIFY → index khác → giám sát.
4. Muốn xem kế hoạch thực thi dạng hình: chọn câu SQL → **Ctrl+Shift+E** (Explain Execution Plan).

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

## Dữ liệu lớn & công cụ đo

```bash
cd api
npm run seed:big                 # sinh 1.000.000 đơn hàng (34 tháng, 37 partition) ~100 s; BIG_ORDERS=3000000 để tăng
npm run bench                    # tool đo: 12 kịch bản có/không index × 5 lần (trung vị), kích thước index
                                 # -> docs/benchmark/bench-report.md + bench-report.json
```
Kết quả gần nhất trên 1.035.853 đơn (máy ảo 2 vCPU, cấu hình mặc định): xem [docs/benchmark/bench-report.md](docs/benchmark/bench-report.md).

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
