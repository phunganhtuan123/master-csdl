// =====================================================================
// embedding.js - Tạo vector 256 chiều cho sản phẩm (dùng với pgvector)
// =====================================================================
// Trong thực tế embedding thường lấy từ mô hình AI (OpenAI text-embedding, CLIP cho ảnh...).
// Để demo không phụ thuộc API bên ngoài, ở đây dùng kỹ thuật "feature hashing":
//   1. Tách văn bản (tên + mô tả + thuộc tính JSONB) thành từ, bỏ dấu, chữ thường
//   2. Tạo thêm bigram (cặp 2 từ liền nhau) để giữ ngữ cảnh ("kim cuong", "vang trang")
//   3. Mỗi token băm (hash) -> 1 vị trí trong 256 chiều, dấu +/- cũng từ hash
//   4. Chuẩn hoá L2 -> so sánh bằng khoảng cách cosine (<=>) trong PostgreSQL
// Thuộc tính JSONB được nhân trọng số cao hơn vì "cùng chất liệu + cùng loại đá" mới là "giống".
// Có thể thay hàm embedProduct() bằng gọi API embedding thật mà không cần đổi schema.
// =====================================================================

export const DIM = 256;

/** Bỏ dấu tiếng Việt + chữ thường */
export function unaccent(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
}

/** FNV-1a 32-bit hash */
function hash(str, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function tokenize(text) {
  return unaccent(text).split(/[^a-z0-9]+/).filter((t) => t.length > 1);
}

/** Cộng dồn các token vào vector với trọng số */
function addTokens(vec, tokens, weight) {
  const all = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) all.push(tokens[i] + '_' + tokens[i + 1]); // bigram
  for (const t of all) {
    const h = hash(t);
    const idx = h % DIM;
    const sign = (hash(t, 0x9747b28c) & 1) ? 1 : -1;
    vec[idx] += sign * weight;
  }
}

/**
 * Tạo embedding cho 1 sản phẩm.
 * @param {{name:string, description?:string, category?:string, attributes?:object}} p
 * @returns {number[]} vector 256 chiều đã chuẩn hoá
 */
export function embedProduct(p) {
  const vec = new Array(DIM).fill(0);
  addTokens(vec, tokenize(p.name), 3);                 // tên: quan trọng nhất
  addTokens(vec, tokenize(p.category ?? ''), 4);       // loại trang sức
  addTokens(vec, tokenize(p.description ?? ''), 1);
  for (const [k, v] of Object.entries(p.attributes ?? {})) {
    if (v === null || typeof v === 'object') continue;
    // token dạng "metal=vang 18k": cùng giá trị thuộc tính -> gần nhau
    addTokens(vec, [unaccent(k) + '=' + unaccent(String(v)).replace(/\s+/g, '_')], 4);
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => +(x / norm).toFixed(6));
}

/** Chuyển mảng JS -> chuỗi literal pgvector: '[0.1,0.2,...]' */
export function toPgVector(arr) {
  return '[' + arr.join(',') + ']';
}
