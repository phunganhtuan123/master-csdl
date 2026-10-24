-- =====================================================================
-- 002: Các bảng lõi: danh mục, sản phẩm (JSONB + FTS + vector), khách hàng, admin
-- =====================================================================

-- ---------------------------------------------------------------------
-- categories: danh mục sản phẩm (Nhẫn, Bông tai, Dây chuyền, ...)
-- parent_id cho phép danh mục con (Nhẫn -> Nhẫn cưới, Nhẫn kim cương)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,            -- dùng trên URL: /danh-muc/nhan-kim-cuong
  name       TEXT NOT NULL,
  parent_id  INT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- products: sản phẩm trang sức
--
-- TÍNH NĂNG 1 - JSONB: cột attributes lưu thuộc tính linh hoạt theo từng loại:
--   Nhẫn      : {"metal":"Vàng 18K","weight_g":2.3,"ring_size":12,"stone":"Kim cương","carat":0.5}
--   Dây chuyền: {"metal":"Vàng 24K","weight_g":5.1,"length_cm":45}
--   Bông tai  : {"metal":"Bạc 925","stone":"CZ","style":"Khuyên"}
--   -> không phải tạo bảng/cột riêng cho từng loại, thêm thuộc tính mới không cần ALTER TABLE
--
-- TÍNH NĂNG 2 - Full-text search tiếng Việt: search_vec là GENERATED COLUMN,
--   PostgreSQL tự tính từ name + description (đã bỏ dấu) mỗi khi INSERT/UPDATE.
--
-- TÍNH NĂNG 3 - pgvector: embedding vector(256) để tìm sản phẩm "giống" sản phẩm đang xem.
-- ---------------------------------------------------------------------
CREATE TABLE products (
  id           BIGSERIAL PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,              -- mã sản phẩm: NK-18K-0001
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category_id  INT NOT NULL REFERENCES categories(id),
  price        NUMERIC(14,0) NOT NULL CHECK (price >= 0),   -- VNĐ, không có số lẻ
  stock        INT NOT NULL DEFAULT 0 CHECK (stock >= 0),   -- ràng buộc cuối cùng chống bán âm kho
  attributes   JSONB NOT NULL DEFAULT '{}'::jsonb,
  description  TEXT,
  image_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','discontinued')),
  embedding    vector(256),
  search_vec   TSVECTOR GENERATED ALWAYS AS (
                 setweight(to_tsvector('simple', vi_unaccent(name)), 'A') ||
                 setweight(to_tsvector('simple', vi_unaccent(coalesce(description, ''))), 'B')
               ) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN products.attributes IS 'Thuộc tính linh hoạt theo loại trang sức (JSONB)';
COMMENT ON COLUMN products.search_vec IS 'Generated column: tsvector đã bỏ dấu, name trọng số A, description trọng số B';
COMMENT ON COLUMN products.embedding  IS 'pgvector 256 chiều, dùng cho gợi ý sản phẩm tương tự';

-- Ảnh phụ của sản phẩm (1 sản phẩm nhiều ảnh)
CREATE TABLE product_images (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- customers: khách hàng (đặt hàng không cần đăng nhập, nhận diện bằng số điện thoại)
-- ---------------------------------------------------------------------
CREATE TABLE customers (
  id         BIGSERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,
  email      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- admins: tài khoản quản trị
-- ---------------------------------------------------------------------
CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tự cập nhật updated_at mỗi khi sửa sản phẩm
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
