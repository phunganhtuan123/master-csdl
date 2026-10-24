'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_URL, vnd } from '@/lib/api';
import { getToken } from '@/lib/admin';

const MENU = [
  ['/admin', 'Tổng quan'],
  ['/admin/don-hang', 'Đơn hàng'],
  ['/admin/san-pham', 'Sản phẩm'],
  ['/admin/monitor', 'Monitor & Benchmark'],
];

export default function AdminLayout({ children }) {
  const path = usePathname();
  const [toasts, setToasts] = useState([]);
  const isLogin = path === '/admin/login';

  // Nhận sự kiện real-time từ PostgreSQL (LISTEN/NOTIFY -> SSE)
  useEffect(() => {
    if (isLogin) return;
    const token = getToken();
    if (!token) { window.location.href = '/admin/login'; return; }
    const es = new EventSource(`${API_URL}/api/admin/events?token=${token}`);
    const push = (t) => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur, { id, ...t }]);
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 8000);
    };
    es.addEventListener('low_stock', (e) => {
      const d = JSON.parse(e.data);
      push({ red: true, title: '⚠ Sắp hết hàng', body: `${d.name} (${d.sku}) chỉ còn ${d.stock}` });
    });
    es.addEventListener('new_order', (e) => {
      const d = JSON.parse(e.data);
      push({ title: '🛍 Đơn hàng mới', body: `#${d.order_id} · ${vnd(d.total)}` });
      window.dispatchEvent(new CustomEvent('new_order', { detail: d }));
    });
    return () => es.close();
  }, [isLogin]);

  if (isLogin) return children;

  return (
    <div className="admin">
      <aside>
        <div className="brand">AN THƯ<small>QUẢN TRỊ</small></div>
        {MENU.map(([href, label]) => (
          <Link key={href} href={href} className={path === href || (href !== '/admin' && path.startsWith(href)) ? 'active' : ''}>{label}</Link>
        ))}
        <hr style={{ borderColor: '#3a332a', margin: '16px 0' }} />
        <Link href="/" target="_blank">↗ Xem cửa hàng</Link>
        <a href="#" onClick={(e) => { e.preventDefault(); localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; }}>Đăng xuất</a>
        <div className="muted" style={{ fontSize: '.72rem', marginTop: 24, color: '#8a8070' }}>
          Thông báo góc phải = PostgreSQL <code>pg_notify</code> → SSE
        </div>
      </aside>
      <main>{children}</main>
      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.red ? 'red' : ''}`}><strong>{t.title}</strong><br />{t.body}</div>)}
      </div>
    </div>
  );
}
