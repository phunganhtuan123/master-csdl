'use client';
import Link from 'next/link';
import { useState } from 'react';
import { vnd, fmtDate, STATUS_LABEL } from '@/lib/api';
import { adminApi, useLoad } from '@/lib/admin';

const CHIP = { pending: '', confirmed: 'blue', shipping: 'blue', completed: 'green', cancelled: 'red' };

export default function OrdersPage() {
  const [f, setF] = useState({ status: '', q: '', from: '', to: '', page: 1 });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const { data, loading, error } = useLoad(() => adminApi(`/api/admin/orders?${qs}`), [qs]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, page: 1 });
  const pages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <>
      <h1>Đơn hàng</h1>
      <div className="card row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ width: 240 }} placeholder="SĐT / tên / mã đơn" value={f.q} onChange={set('q')} />
        <select className="input" style={{ width: 170 }} value={f.status} onChange={set('status')}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="muted">Từ</span><input type="date" className="input" style={{ width: 160 }} value={f.from} onChange={set('from')} />
        <span className="muted">đến</span><input type="date" className="input" style={{ width: 160 }} value={f.to} onChange={set('to')} />
        {(f.from || f.to) && <span className="muted mode-tag">→ partition pruning + BRIN</span>}
      </div>
      {error && <div className="alert err">{error}</div>}
      <table className="tbl">
        <thead><tr><th>Mã</th><th>Thời gian</th><th>Khách hàng</th><th className="num">SP</th><th className="num">Tổng</th><th>Trạng thái</th></tr></thead>
        <tbody>
          {data?.items.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/admin/don-hang/${o.id}`} className="gold"><strong>#{o.id}</strong></Link></td>
              <td>{fmtDate(o.created_at)}</td>
              <td>{o.customer_name}<br /><span className="muted">{o.customer_phone}</span></td>
              <td className="num">{o.item_count}</td>
              <td className="num">{vnd(o.total)}</td>
              <td><span className={`chip ${CHIP[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row between" style={{ marginTop: 12 }}>
        <span className="muted">{loading ? 'Đang tải…' : `${data?.total.toLocaleString('vi-VN')} đơn`}</span>
        <div className="row">
          <button className="btn sm ghost" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>‹</button>
          <span>Trang {f.page}/{pages || 1}</span>
          <button className="btn sm ghost" disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })}>›</button>
        </div>
      </div>
    </>
  );
}
