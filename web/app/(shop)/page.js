import Link from 'next/link';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

export default async function HomePage() {
  const [cats, featured] = await Promise.all([
    api('/api/categories'),
    api('/api/products?featured=1&limit=8&sort=newest'),
  ]);

  return (
    <>
      <section className="hero">
        <div>
          <span className="chip">Trang sức vàng · kim cương · bạc</span>
          <h1>Tinh hoa trang sức, <br />lưu giữ khoảnh khắc</h1>
          <p>Nhẫn kim cương, nhẫn cưới, dây chuyền và bông tai vàng 18K–24K. Kiểm định GIA, bảo hành đánh bóng trọn đời.</p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link href="/san-pham" className="btn">Xem bộ sưu tập</Link>
            <Link href="/san-pham?stone=Kim%20c%C6%B0%C6%A1ng" className="btn ghost">Kim cương</Link>
          </div>
        </div>
        <div className="art"><img src="/img/nhan.svg" alt="" /></div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Danh mục</h2><Link href="/san-pham" className="gold">Tất cả →</Link></div>
        <div className="grid grid-4">
          {cats.filter((c) => !c.parent_id).map((c) => (
            <Link key={c.id} href={`/san-pham?category=${c.slug}`} className="card row between">
              <div><strong>{c.name}</strong><div className="muted" style={{ fontSize: '.85rem' }}>{c.product_count} sản phẩm</div></div>
              <img src={`/img/${c.slug}.svg`} alt="" style={{ width: 56, borderRadius: 10 }} />
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Sản phẩm nổi bật</h2><Link href="/san-pham?featured=1" className="gold">Xem thêm →</Link></div>
        <div className="grid grid-4">{featured.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>
    </>
  );
}
