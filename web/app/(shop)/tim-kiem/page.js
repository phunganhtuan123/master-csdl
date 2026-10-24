import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

// Kết quả tìm kiếm: full-text (tsvector) -> nếu không có thì trigram (gõ sai chính tả)
export default async function SearchPage({ searchParams }) {
  const { q = '' } = await searchParams;
  const data = q ? await api(`/api/search?q=${encodeURIComponent(q)}`) : { mode: 'none', items: [] };
  const modeText = {
    fulltext: 'Full-text search (tsvector + GIN) — bỏ dấu, xếp hạng ts_rank',
    fuzzy: 'Không khớp từ nào, chuyển sang tìm gần đúng bằng trigram (pg_trgm) — chịu lỗi chính tả',
    none: '',
  }[data.mode];
  return (
    <section className="section">
      <h1>Kết quả cho “{q}”</h1>
      <p className="muted">{data.items.length} sản phẩm · <span className="mode-tag">{modeText}</span></p>
      {data.items.length === 0 && <div className="alert info">Không tìm thấy. Thử từ khoá khác, ví dụ: <i>nhan kim cuong</i>, <i>bong tai ngoc trai</i>.</div>}
      <div className="grid grid-4">{data.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}
