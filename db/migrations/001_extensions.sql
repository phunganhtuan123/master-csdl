-- =====================================================================
-- 001: Bật các extension của PostgreSQL dùng trong hệ thống
-- =====================================================================
-- pg_trgm      : tìm kiếm gần đúng (fuzzy) bằng trigram  -> gõ sai chính tả vẫn tìm được
-- unaccent     : bỏ dấu tiếng Việt                      -> "nhan kim cuong" khớp "Nhẫn kim cương"
-- vector       : pgvector, lưu embedding + index HNSW    -> gợi ý sản phẩm tương tự (AI)
-- pg_stat_statements: thống kê câu SQL nào chạy nhiều/chậm -> monitor
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- unaccent() mặc định là STABLE nên không dùng được trong index / generated column.
-- Bọc lại thành hàm IMMUTABLE để PostgreSQL cho phép đánh index trên kết quả bỏ dấu.
CREATE OR REPLACE FUNCTION vi_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT lower(public.unaccent('public.unaccent', $1)) $$;

COMMENT ON FUNCTION vi_unaccent(text) IS
  'Bỏ dấu + chuyển chữ thường tiếng Việt, IMMUTABLE để dùng trong index và cột generated';
