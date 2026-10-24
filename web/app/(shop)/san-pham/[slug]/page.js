import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, vnd, ATTR_LABEL } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import AddToCart from './AddToCart';

export default async function ProductDetail({ params }) {
  const { slug } = await params;
  let p;
  try { p = await api(`/api/products/${slug}`); } catch { notFound(); }
  const similar = await api(`/api/products/${slug}/similar`);

  const fmtVal = (v) => (v === true ? 'Có' : v === false ? 'Không' : Array.isArray(v) ? v.join(', ') : String(v));

  return (
    <>
      <div className="muted" style={{ margin: '18px 0 0', fontSize: '.9rem' }}>
        <Link href="/san-pham">Sản phẩm</Link> › <Link href={`/san-pham?category=${p.category_slug}`}>{p.category}</Link> › {p.name}
      </div>
      <div className="detail">
        <div className="gallery"><img src={p.image_url || '/img/nhan.svg'} alt={p.name} /></div>
        <div>
          <span className="chip">{p.category}</span>
          <h1 style={{ marginTop: 10 }}>{p.name}</h1>
          <div className="muted">Mã: {p.sku}</div>
          <div className="price" style={{ margin: '12px 0' }}>{vnd(p.price)}</div>
          <div className="row">
            {p.stock === 0 ? <span className="chip red">Hết hàng</span>
              : p.stock < 3 ? <span className="chip red">Chỉ còn {p.stock} sản phẩm</span>
              : <span className="chip green">Còn hàng ({p.stock})</span>}
          </div>
          <p>{p.description}</p>

          <h3>Thông số <span className="muted mode-tag" style={{ fontWeight: 400 }}>(JSONB attributes)</span></h3>
          <div className="attrs">
            {Object.entries(p.attributes || {}).map(([k, v]) => (
              <div key={k}><span>{ATTR_LABEL[k] || k}</span><strong>{fmtVal(v)}</strong></div>
            ))}
          </div>
          <AddToCart p={p} />
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Có thể bạn cũng thích</h2>
          <span className="muted mode-tag">pgvector · ORDER BY embedding &lt;=&gt; … (HNSW)</span>
        </div>
        <div className="grid grid-4">
          {similar.map((s) => <ProductCard key={s.id} p={s} extra={<span className="muted" style={{ fontSize: '.75rem' }}>độ tương đồng {(s.similarity * 100).toFixed(0)}%</span>} />)}
        </div>
      </section>
    </>
  );
}
