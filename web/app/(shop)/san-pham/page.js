import Link from 'next/link';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

// Trang danh sách: lọc theo danh mục + thuộc tính JSONB (metal, stone, gender) + giá + sắp xếp
export default async function ProductsPage({ searchParams }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v));
  const [data, cats, filters] = await Promise.all([
    api(`/api/products?${qs.toString()}`),
    api('/api/categories'),
    api('/api/products/filters'),
  ]);

  const link = (patch) => {
    const n = new URLSearchParams(qs);
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === '') n.delete(k); else n.set(k, v); }
    n.delete('page');
    return `/san-pham?${n.toString()}`;
  };
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  const cur = Number(sp.page || 1);
  const activeCat = cats.find((c) => c.slug === sp.category);

  return (
    <div className="catalog">
      <aside className="filters">
        <h3>Danh mục</h3>
        <Link href={link({ category: null })} className={!sp.category ? 'active' : ''}>Tất cả</Link>
        {cats.map((c) => (
          <Link key={c.id} href={link({ category: c.slug })} className={sp.category === c.slug ? 'active' : ''}
                style={{ paddingLeft: c.parent_id ? 14 : 0 }}>{c.name} <span className="muted">({c.product_count})</span></Link>
        ))}
        <h3>Chất liệu</h3>
        <Link href={link({ metal: null })} className={!sp.metal ? 'active' : ''}>Tất cả</Link>
        {filters.metals.map((m) => (
          <Link key={m.v} href={link({ metal: m.v })} className={sp.metal === m.v ? 'active' : ''}>{m.v} <span className="muted">({m.n})</span></Link>
        ))}
        <h3>Loại đá</h3>
        <Link href={link({ stone: null })} className={!sp.stone ? 'active' : ''}>Tất cả</Link>
        {filters.stones.map((m) => (
          <Link key={m.v} href={link({ stone: m.v })} className={sp.stone === m.v ? 'active' : ''}>{m.v} <span className="muted">({m.n})</span></Link>
        ))}
        <h3>Khoảng giá</h3>
        {[['Dưới 1 triệu', null, 1000000], ['1 – 5 triệu', 1000000, 5000000], ['5 – 20 triệu', 5000000, 20000000], ['Trên 20 triệu', 20000000, null]].map(([t, min, max]) => (
          <Link key={t} href={link({ min, max })} className={String(sp.min ?? '') === String(min ?? '') && String(sp.max ?? '') === String(max ?? '') ? 'active' : ''}>{t}</Link>
        ))}
        <Link href={link({ min: null, max: null })} className="muted">Bỏ lọc giá</Link>
      </aside>

      <section>
        <div className="section-head">
          <div>
            <h1 style={{ marginBottom: 2 }}>{activeCat?.name || 'Tất cả sản phẩm'}</h1>
            <span className="muted">{data.total.toLocaleString('vi-VN')} sản phẩm
              {(sp.metal || sp.stone) && <> · lọc JSONB: <code className="mode-tag">{JSON.stringify({ ...(sp.metal && { metal: sp.metal }), ...(sp.stone && { stone: sp.stone }) })}</code></>}
            </span>
          </div>
          <div className="row">
            <span className="muted">Sắp xếp</span>
            {[['newest', 'Mới nhất'], ['price_asc', 'Giá tăng'], ['price_desc', 'Giá giảm']].map(([k, t]) => (
              <Link key={k} href={link({ sort: k })} className={`chip ${(sp.sort || 'newest') === k ? '' : 'gray'}`}>{t}</Link>
            ))}
          </div>
        </div>

        {data.items.length === 0 && <div className="alert info">Không có sản phẩm phù hợp.</div>}
        <div className="grid grid-3">{data.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>

        {pages > 1 && (
          <div className="pager">
            {cur > 1 && <Link href={`${link({})}&page=${cur - 1}`}>‹</Link>}
            {Array.from({ length: pages }, (_, i) => i + 1).filter((i) => Math.abs(i - cur) <= 2 || i === 1 || i === pages).map((i, idx, arr) => (
              <span key={i} style={{ display: 'contents' }}>
                {idx > 0 && arr[idx - 1] !== i - 1 && <span>…</span>}
                {i === cur ? <span className="cur">{i}</span> : <Link href={`${link({})}&page=${i}`}>{i}</Link>}
              </span>
            ))}
            {cur < pages && <Link href={`${link({})}&page=${cur + 1}`}>›</Link>}
          </div>
        )}
      </section>
    </div>
  );
}
