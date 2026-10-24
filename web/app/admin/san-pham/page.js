'use client';
import Link from 'next/link';
import { useState } from 'react';
import { vnd } from '@/lib/api';
import { adminApi, useLoad } from '@/lib/admin';

export default function AdminProducts() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useLoad(() => adminApi(`/api/admin/products?q=${encodeURIComponent(q)}&page=${page}`), [q, page]);
  const pages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <>
      <div className="row between"><h1>Sản phẩm</h1><Link href="/admin/san-pham/new" className="btn sm">+ Thêm sản phẩm</Link></div>
      <div className="card row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ width: 320 }} placeholder="Tìm theo tên (không dấu cũng được) / SKU" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <span className="muted mode-tag">vi_unaccent(name) ILIKE → GIN trigram</span>
      </div>
      {error && <div className="alert err">{error}</div>}
      <table className="tbl">
        <thead><tr><th>SKU</th><th>Tên</th><th>Danh mục</th><th>Thuộc tính (JSONB)</th><th className="num">Giá</th><th className="num">Tồn</th><th>TT</th></tr></thead>
        <tbody>
          {data?.items.map((p) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td><Link href={`/admin/san-pham/${p.id}`} className="row"><img src={p.image_url} width={34} style={{ borderRadius: 6 }} alt="" /><strong>{p.name}</strong></Link></td>
              <td>{p.category}</td>
              <td style={{ fontSize: '.8rem' }}>{Object.entries(p.attributes).slice(0, 4).map(([k, v]) => <span key={k} className="chip gray" style={{ marginRight: 4 }}>{k}: {String(v)}</span>)}</td>
              <td className="num">{vnd(p.price)}</td>
              <td className="num"><span className={`chip ${p.stock === 0 ? 'red' : p.stock < 3 ? '' : 'green'}`}>{p.stock}</span></td>
              <td><span className={`chip ${p.status === 'active' ? 'green' : 'gray'}`}>{p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row between" style={{ marginTop: 12 }}>
        <span className="muted">{loading ? 'Đang tải…' : `${data?.total.toLocaleString('vi-VN')} sản phẩm`}</span>
        <div className="row">
          <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span>Trang {page}/{pages || 1}</span>
          <button className="btn sm ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      </div>
    </>
  );
}
