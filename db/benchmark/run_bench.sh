#!/usr/bin/env bash
# =====================================================================
# run_bench.sh - chạy benchmark, kết quả lưu vào db/benchmark/results/
#   bash db/benchmark/run_bench.sh explain    # EXPLAIN ANALYZE trước/sau index
#   bash db/benchmark/run_bench.sh order      # pgbench đặt hàng đồng thời (TPS)
#   bash db/benchmark/run_bench.sh search     # pgbench tải đọc (FTS + JSONB + vector)
#   bash db/benchmark/run_bench.sh oversell   # kiểm chứng không bán quá kho
#   bash db/benchmark/run_bench.sh all
# =====================================================================
set -e
DB="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/jewelry}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/results"; mkdir -p "$OUT"
CLIENTS="${CLIENTS:-50}"; SECONDS_RUN="${SECONDS_RUN:-15}"

explain()  { psql "$DB" -f "$DIR/explain_before_after.sql" | tee "$OUT/explain.txt"; }
order()    { psql "$DB" -q -c "UPDATE products SET stock = stock + 1000 WHERE sku LIKE 'GEN-%';"   # nạp kho để không gặp OUT_OF_STOCK
             pgbench -n -c "$CLIENTS" -j 4 -T "$SECONDS_RUN" -f "$DIR/pgbench_place_order.sql" "$DB" 2>&1 | tee "$OUT/pgbench_order.txt"; }
search()   { pgbench -n -c 20 -j 4 -T "$SECONDS_RUN" -f "$DIR/pgbench_search.sql" "$DB" 2>&1 | tee "$OUT/pgbench_search.txt"; }
oversell() {
  psql "$DB" -q -c "UPDATE products SET stock = 5 WHERE id = 2;"
  pgbench -n -c 50 -j 4 -t 1 -f "$DIR/oversell_test.sql" "$DB" 2>&1 | grep -E "transactions|failed|tps" | tee "$OUT/oversell.txt" || true
  psql "$DB" -c "SELECT id, name, stock FROM products WHERE id = 2;" \
             -c "SELECT count(*) AS don_thanh_cong FROM orders WHERE note = 'oversell-test';" | tee -a "$OUT/oversell.txt"
}
case "${1:-all}" in
  explain) explain ;; order) order ;; search) search ;; oversell) oversell ;;
  all) explain; order; search; oversell ;;
  *) echo "dùng: $0 {explain|order|search|oversell|all}" ;;
esac
