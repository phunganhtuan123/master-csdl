# Tổng hợp lệnh — chạy, demo, benchmark

Mọi lệnh chạy trong thư mục gốc `master-csdl/` (trừ khi ghi khác). Yêu cầu: Docker Desktop đang mở.

## 1. Khởi động (deploy local)

```bash
docker compose up -d --build        # lần đầu 2-3 phút: build image → migrate → seed → embed
docker compose logs -f api          # chờ thấy "LISTEN low_stock, new_order" rồi Ctrl+C
docker compose ps                   # 3 container: jewelry-db, jewelry-api, jewelry-web
```

| Địa chỉ | Dùng để |
|---|---|
| http://localhost:3000 | Trang bán hàng |
| http://localhost:3000/admin — `admin` / `admin123` | Quản trị · Monitor & Benchmark |
| http://localhost:4000/api/health | Kiểm tra API |
| `localhost:5432` · db `jewelry` · `postgres` / `postgres` | DBeaver / psql |

## 2. Dữ liệu lớn (1 triệu đơn, để demo partition & index)

```bash
docker compose exec api npm run seed:big              # ~2 phút, 1.000.000 đơn, 37 partition
docker compose exec -e BIG_ORDERS=3000000 api npm run seed:big   # muốn nhiều hơn
```

## 3. Benchmark

```bash
docker compose exec api npm run bench                 # 12 kịch bản có/không index × 5 lần (trung vị),
                                                      # in bảng + ghi docs/benchmark/bench-report.md/.json
docker compose exec -e ROUNDS=9 api npm run bench     # đo kỹ hơn
```

pgbench (đồng thời, chống bán quá kho) — chạy trong container db:

```bash
docker compose cp db/benchmark jewelry-db:/tmp/benchmark
docker compose exec db bash -c "DATABASE_URL=postgres://postgres:postgres@localhost:5432/jewelry bash /tmp/benchmark/run_bench.sh oversell"   # 50 client mua 5 chiếc cuối → đúng 5 đơn
docker compose exec db bash -c "DATABASE_URL=postgres://postgres:postgres@localhost:5432/jewelry bash /tmp/benchmark/run_bench.sh order"      # TPS đặt hàng 30 client
docker compose exec db bash -c "DATABASE_URL=postgres://postgres:postgres@localhost:5432/jewelry bash /tmp/benchmark/run_bench.sh search"     # TPS tải đọc
```
(image pgvector/pgvector:pg16 có sẵn `pgbench`.)

## 4. Demo SQL cho giảng viên

**DBeaver:** New Connection → PostgreSQL → `localhost` / `5432` / `jewelry` / `postgres` / `postgres` → mở `db/demo/demo_queries.sql` → chọn khối → **Cmd+Enter**. Explain dạng hình: **Ctrl+Shift+E**.

**psql (không cần DBeaver):**
```bash
docker compose exec db psql -U postgres -d jewelry                      # vào shell SQL
docker compose exec -T db psql -U postgres -d jewelry < db/demo/demo_queries.sql   # chạy cả file
```

Vài lệnh nhanh trong psql:
```sql
\dt                       -- bảng
\di                       -- index
\d+ orders                -- xem partition của orders
\dx                       -- extension (vector, pg_trgm, unaccent, pg_stat_statements)
\df place_order           -- hàm đặt hàng
\timing on                -- bật đo thời gian
```

## 5. Vận hành

```bash
docker compose logs -f api            # log API (thấy câu NOTIFY, lỗi OUT_OF_STOCK)
docker compose restart api            # khởi động lại API
docker compose exec api npm run reset # XOÁ schema, chạy lại migrate + seed + embed (mất 1 triệu đơn)
docker compose down                   # tắt, giữ dữ liệu
docker compose down -v                # tắt + xoá dữ liệu, lần sau up lại từ đầu
docker compose up -d --build api web  # build lại sau khi sửa code
```

## 6. Chạy không dùng Docker (dev)

Cần PostgreSQL 16 có extension `vector` và `pg_stat_statements` trong `shared_preload_libraries`.

```bash
cd api && cp .env.example .env && npm install
npm run migrate && npm run seed && npm run embed
npm run dev                            # API :4000
cd ../web && npm install && npm run dev  # Web :3000
```

## 7. Sinh lại tiểu luận / slide (khi sửa nội dung)

```bash
cd docs/build && npm install
node build.js && node build.js pages.json     # tiểu luận .docx (2 lần để có số trang mục lục; pages.json sinh bằng pages.py từ PDF pass 1)
node slides_hutech.js                         # slide .pptx
```
Xuất PDF: mở file trong Word/PowerPoint → Save as PDF.
