// Gọi API backend. Server Component dùng API_INTERNAL_URL (trong Docker là http://api:4000),
// trình duyệt dùng NEXT_PUBLIC_API_URL.
export const API_URL =
  typeof window === 'undefined'
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function api(path, { method = 'GET', body, token, cache = 'no-store' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, cache });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

export const vnd = (n) => (n == null ? '' : Number(n).toLocaleString('vi-VN') + ' ₫');

export const fmtDate = (s) => new Date(s).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

export const STATUS_LABEL = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã huỷ',
};

// Nhãn tiếng Việt cho khoá thuộc tính JSONB
export const ATTR_LABEL = {
  metal: 'Chất liệu', weight_g: 'Trọng lượng (g)', ring_size: 'Ni (size)', stone: 'Đá', carat: 'Carat',
  color: 'Màu', clarity: 'Độ sạch', cut: 'Giác cắt', gender: 'Giới tính', length_cm: 'Chiều dài (cm)',
  diameter_mm: 'Đường kính (mm)', pearl_mm: 'Ngọc trai (mm)', style: 'Kiểu', clasp: 'Khoá', motif: 'Hoạ tiết',
  origin: 'Xuất xứ', pair: 'Cặp đôi', engraving: 'Khắc tên', stone_count: 'Số viên', certified: 'Kiểm định',
  zodiac: 'Tuổi', letters: 'Chữ cái', bells: 'Lục lạc', length_mm: 'Dài (mm)',
};
