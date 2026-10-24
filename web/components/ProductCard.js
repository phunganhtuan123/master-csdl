import Link from 'next/link';
import { vnd } from '@/lib/api';

export default function ProductCard({ p, extra }) {
  return (
    <Link href={`/san-pham/${p.slug}`} className="product">
      <img src={p.image_url || '/img/nhan.svg'} alt={p.name} loading="lazy" />
      <div className="body">
        {p.category && <span className="muted" style={{ fontSize: '.78rem' }}>{p.category}</span>}
        <div className="name" dangerouslySetInnerHTML={{ __html: p.headline || p.name }} />
        {p.attributes?.metal && <span className="muted" style={{ fontSize: '.82rem' }}>{p.attributes.metal}{p.attributes.stone ? ` · ${p.attributes.stone}` : ''}</span>}
        <div className="row between" style={{ marginTop: 'auto' }}>
          <span className="price">{vnd(p.price)}</span>
          {p.stock === 0 ? <span className="chip red">Hết hàng</span> : p.stock < 3 ? <span className="chip">Còn {p.stock}</span> : null}
        </div>
        {extra}
      </div>
    </Link>
  );
}
