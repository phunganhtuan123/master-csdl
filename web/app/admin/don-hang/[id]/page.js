'use client';
import Link from 'next/link';
import { use, useState } from 'react';
import { vnd, fmtDate, STATUS_LABEL } from '@/lib/api';
import { adminApi, useLoad } from '@/lib/admin';

const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };

export default function OrderDetail({ params }) {
  const { id } = use(params);
  const { data: o, loading, error, reload } = useLoad(() => adminApi(`/api/admin/orders/${id}`), [id]);
  const [msg, setMsg] = useState('');

  const setStatus = async (status) => {
    setMsg('');
    try {
      await adminApi(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: { status } });
      setMsg(status === 'cancelled' ? 'Đã huỷ đơn và trả lại tồn kho (cancel_order() — 1 transaction).' : `Đã chuyển sang: ${STATUS_LABEL[status]}`);
      reload();
    } catch (e) { setMsg('Lỗi: ' + e.message); }
  };

  if (error) return <div className="alert err">{error}</div>;
  if (loading || !o) return <p className="muted">Đang tải…</p>;

  return (
    <>
      <Link href="/admin/don-hang" className="muted">← Đơn hàng</Link>
      <div className="row between"><h1>Đơn #{o.id} <span className="chip blue">{STATUS_LABEL[o.status]}</span></h1>
        <div className="row">
          {NEXT[o.status].map((s) => (
            <button key={s} className={`btn sm ${s === 'cancelled' ? 'danger' : ''}`} onClick={() => confirm(`Chuyển sang "${STATUS_LABEL[s]}"?`) && setStatus(s)}>
              {s === 'cancelled' ? 'Huỷ đơn' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      {msg && <div className={`alert ${msg.startsWith('Lỗi') ? 'err' : 'ok'}`}>{msg}</div>}
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Khách hàng</h3>
          <p><strong>{o.customer_name}</strong><br />{o.customer_phone}<br />{o.customer_address}</p>
          <p className="muted">Đặt lúc {fmtDate(o.created_at)}{o.note && <><br />Ghi chú: {o.note}</>}</p>
        </div>
        <div className="card">
          <h3>Sản phẩm</h3>
          <table className="tbl">
            <thead><tr><th>SP</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Tiền</th></tr></thead>
            <tbody>
              {o.items.map((i) => <tr key={i.product_id}><td>{i.name}<br /><span className="muted">{i.sku}</span></td><td className="num">{i.qty}</td><td className="num">{vnd(i.unit_price)}</td><td className="num">{vnd(i.line_total)}</td></tr>)}
              <tr><td colSpan={3} className="num">Ship</td><td className="num">{vnd(o.shipping_fee)}</td></tr>
              <tr><td colSpan={3} className="num"><strong>Tổng (generated column)</strong></td><td className="num"><strong className="gold">{vnd(o.total)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
