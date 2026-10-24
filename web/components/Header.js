'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, vnd } from '@/lib/api';
import { useCart } from '@/lib/cart';

export default function Header() {
  const router = useRouter();
  const cart = useCart();
  const [q, setQ] = useState('');
  const [sug, setSug] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef();

  // Gợi ý khi gõ: gọi /api/search/suggest (prefix search tsquery 'nha:*') sau 200ms
  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setSug([]); return; }
    timer.current = setTimeout(async () => {
      try { setSug(await api(`/api/search/suggest?q=${encodeURIComponent(q)}`)); setOpen(true); } catch {}
    }, 200);
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    if (q.trim()) router.push(`/tim-kiem?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="brand">AN THƯ<small>JEWELRY · POSTGRESQL DEMO</small></Link>
        <nav className="nav">
          <Link href="/san-pham">Sản phẩm</Link>
          <Link href="/san-pham?category=nhan">Nhẫn</Link>
          <Link href="/san-pham?category=day-chuyen">Dây chuyền</Link>
          <Link href="/san-pham?category=bong-tai">Bông tai</Link>
          <Link href="/tra-cuu">Tra cứu đơn</Link>
        </nav>
        <form className="search" onSubmit={submit} onBlur={() => setTimeout(() => setOpen(false), 150)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => sug.length && setOpen(true)}
                 placeholder="Tìm: nhẫn kim cương 18k, bong tai ngoc trai..." />
          {open && sug.length > 0 && (
            <div className="suggest">
              {sug.map((s) => (
                <Link key={s.slug} href={`/san-pham/${s.slug}`} onClick={() => setOpen(false)}>
                  <img src={s.image_url} alt="" /><span>{s.name}</span><span className="muted" style={{ marginLeft: 'auto' }}>{vnd(s.price)}</span>
                </Link>
              ))}
            </div>
          )}
        </form>
        <Link href="/gio-hang" className="cart-btn">
          Giỏ hàng {cart?.count > 0 && <span className="badge">{cart.count}</span>}
        </Link>
      </div>
    </header>
  );
}
