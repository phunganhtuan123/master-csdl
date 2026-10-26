# Kết quả benchmark PostgreSQL

*Sinh lúc 22:41:24 26/10/2026 · 5 lần mỗi kịch bản, lấy trung vị · PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)*

| Dữ liệu | Giá trị |
|---|---|
| Sản phẩm | 3.033 |
| Đơn hàng | 1.035.853 (37 partition, 312 MB) |
| Chi tiết đơn | 1.543.358 (241 MB) |
| Dung lượng CSDL | 602 MB |
| shared_buffers / work_mem | 128MB / 4MB |

## Thời gian thực thi có / không có index

| # | Kịch bản | Có index (ms) | Không index (ms) | Nhanh hơn | Scan khi có index | Partition quét |
|---|---|---:|---:|---:|---|---:|
| 1 | JSONB @> với GIN (jsonb_path_ops) | 0.062 | 2.136 | **34.5×** | Bitmap Heap Scan + Bitmap Index Scan (idx_products_attributes) | – |
| 2 | Full-text search tiếng Việt (GIN tsvector) | 0.065 | 0.622 | **9.6×** | Bitmap Heap Scan + Bitmap Index Scan (idx_products_search_vec) | – |
| 3 | Tìm gần đúng bằng trigram (gõ sai chính tả) | 6.346 | 16.256 | **2.6×** | Bitmap Heap Scan + Bitmap Index Scan (idx_products_name_trgm) | – |
| 4 | pgvector: 8 láng giềng gần nhất (HNSW) | 0.232 | 1.72 | **7.4×** | Index Scan (products_sku_key, idx_products_embedding) | – |
| 5 | Doanh thu 2 tuần: partition pruning + BRIN | 3.276 | 66.405 | **20.3×** | Seq Scan | 1 / 37 |
| 6 | Báo cáo doanh thu 1 tháng theo trạng thái | 10.467 | 62.382 | **6×** | Seq Scan | 1 / 37 |
| 7 | BRIN lọc 3 ngày (ép dùng BRIN) so với quét cả partition | 2.739 | 1.927 | **0.7×** | Bitmap Heap Scan + Bitmap Index Scan (orders_*_created_at_idx) | 1 / 1 |
| 8 | Lịch sử mua của khách: covering index (INCLUDE) | 0.207 | 51.885 | **250.7×** | Index Only Scan (orders_*_customer_id_created_at_id_status_total_idx), Heap Fetches 0 | 37 / 37 |
| 9 | Đơn chờ xử lý mới nhất: partial index | 0.202 | 97.83 | **484.3×** | Index Scan (orders_*_created_at_idx1) | 37 / 37 |
| 10 | Sản phẩm sắp hết hàng: partial index | 0.02 | 1.714 | **85.7×** | Bitmap Heap Scan + Bitmap Index Scan (idx_products_low_stock) | – |
| 11 | Doanh thu 30 ngày: matview vs tính trực tiếp | 0.018 | 19.388 | **1077.1×** | Bitmap Heap Scan + Bitmap Index Scan (mv_sales_daily_day_idx) | – |
| 12 | Top 10 sản phẩm bán chạy: matview vs JOIN toàn bộ | 0.02 | 1142.225 | **57111.2×** | Seq Scan | – |

## Kích thước index

| Index | Kích thước | Ghi chú |
|---|---:|---|
| BRIN trên orders(created_at) | 888 kB | tổng 37 partition |
| B-tree trên orders(created_at) | 23 MB | tạo tạm để so sánh — BRIN nhỏ hơn **26.3×** |
| Partial idx_orders_pending | 17 MB | chỉ đơn pending/confirmed |
| Covering idx_orders_customer_cover | 65 MB | INCLUDE (id, status, total) |
| Partial idx_products_low_stock | 40 kB | so với PK products 168 kB |

### Index trên bảng products

| Index | Kích thước |
|---|---:|
| idx_products_name_trgm | 5536 kB |
| idx_products_search_vec | 4816 kB |
| idx_products_embedding | 4056 kB |
| idx_products_attributes | 1152 kB |
| idx_products_category_price | 432 kB |
| products_sku_key | 200 kB |
| products_slug_key | 200 kB |
| products_pkey | 168 kB |
| idx_products_low_stock | 40 kB |

## Câu SQL của từng kịch bản

**1. JSONB @> với GIN (jsonb_path_ops)** — không index: `SET enable_bitmapscan = off`

```sql
SELECT count(*) FROM products WHERE attributes @> '{"metal":"Vàng 18K","stone":"Kim cương"}'
```

**2. Full-text search tiếng Việt (GIN tsvector)** — không index: `SET enable_bitmapscan = off`

```sql
SELECT id FROM products WHERE search_vec @@ plainto_tsquery('simple', vi_unaccent('nhẫn kim cương 18k')) LIMIT 20
```

**3. Tìm gần đúng bằng trigram (gõ sai chính tả)** — không index: `SET enable_bitmapscan = off`

```sql
SELECT id FROM products WHERE vi_unaccent(name) % 'nhan kim cuog solitare'
```

**4. pgvector: 8 láng giềng gần nhất (HNSW)** — không index: `SET enable_indexscan = off`

```sql
SELECT id FROM products ORDER BY embedding <=> (SELECT embedding FROM products WHERE sku = 'NK-001') LIMIT 8
```

**5. Doanh thu 2 tuần: partition pruning + BRIN** — không index: `SET enable_partition_pruning = off`

```sql
SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-09-01' AND created_at < '2026-09-15'
```

**6. Báo cáo doanh thu 1 tháng theo trạng thái** — không index: `SET enable_partition_pruning = off`

```sql
SELECT status, count(*), sum(total) FROM orders WHERE created_at >= '2026-06-01' AND created_at < '2026-07-01' GROUP BY status
```

**7. BRIN lọc 3 ngày (ép dùng BRIN) so với quét cả partition** — không index: `SET enable_bitmapscan = off`

```sql
SELECT count(*), sum(total) FROM orders WHERE created_at >= '2026-06-10' AND created_at < '2026-06-13'
```

**8. Lịch sử mua của khách: covering index (INCLUDE)** — không index: `SET enable_indexscan, enable_indexonlyscan, enable_bitmapscan = off`

```sql
SELECT id, status, total FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20
```

**9. Đơn chờ xử lý mới nhất: partial index** — không index: `SET enable_indexscan, enable_bitmapscan = off`

```sql
SELECT id, created_at FROM orders WHERE status IN ('pending','confirmed') ORDER BY created_at DESC LIMIT 50
```

**10. Sản phẩm sắp hết hàng: partial index** — không index: `SET enable_indexscan, enable_bitmapscan = off`

```sql
SELECT id, name, stock FROM products WHERE stock < 3 AND status = 'active' ORDER BY stock LIMIT 20
```

**11. Doanh thu 30 ngày: matview vs tính trực tiếp** — không index: `truy vấn tương đương`

```sql
SELECT day, revenue FROM mv_sales_daily WHERE day >= current_date - 30 ORDER BY day
-- so với:
SELECT date_trunc('day', o.created_at)::date AS day, sum(o.total) FROM orders o
WHERE o.created_at >= current_date - 30 AND o.status <> 'cancelled' GROUP BY 1 ORDER BY 1
```

**12. Top 10 sản phẩm bán chạy: matview vs JOIN toàn bộ** — không index: `truy vấn tương đương`

```sql
SELECT product_id, qty_sold FROM mv_top_products LIMIT 10
-- so với:
SELECT oi.product_id, sum(oi.qty) AS qty_sold FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.created_at = oi.order_created_at
WHERE o.status <> 'cancelled' GROUP BY 1 ORDER BY 2 DESC LIMIT 10
```
