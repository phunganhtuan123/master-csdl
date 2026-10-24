'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, vnd } from '@/lib/api';
import { useCart } from '@/lib/cart';

// Giỏ hàng + đặt hàng: POST /api/orders -> place_order() (transaction + FOR UPDATE)
export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', address: '', note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const ship = cart.total >= 5000000 ? 0 : 30000;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const { note, ...customer } = form;
      const r = await api('/api/orders', { method: 'POST', body: { customer, items: cart.items.map((i) => ({ product_id: i.id, qty: i.qty })), note } });
      cart.clear();
      router.push(`/don-hang/${r.order_id}?phone=${encodeURIComponent(form.phone)}&new=1`);
    } catch (e) {
      setErr(e.message);   // ví dụ: "Nhẫn X chỉ còn 1 sản phẩm, bạn đặt 2" (RAISE từ PL/pgSQL)
    } finally { setBusy(false); }
  };

  if (!cart.ready) return null;
  if (cart.items.length === 0) return (
    <section className="section"><h1>Giỏ hàng trống</h1><Link href="/san-pham" className="btn">Xem sản phẩm</Link></section>
  );

  return (
    <div className="grid grid-2" style={{ margin: '28px 0', alignItems: 'start' }}>
      <section>
        <h1>Giỏ hàng</h1>
        <table className="tbl">
          <thead><tr><th>Sản phẩm</th><th>SL</th><th className="num">Thành tiền</th><th></th></tr></thead>
          <tbody>
            {cart.items.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/san-pham/${i.slug}`} className="row"><img src={i.image_url} width={44} style={{ borderRadius: 6 }} alt="" /><span>{i.name}<br /><span className="muted">{vnd(i.price)}</span></span></Link></td>
                <td><input type="number" className="input" style={{ width: 64 }} min={1} max={i.stock} value={i.qty} onChange={(e) => cart.setQty(i.id, Math.min(i.stock, Number(e.target.value)))} /></td>
                <td className="num">{vnd(i.price * i.qty)}</td>
                <td><button className="btn ghost sm" onClick={() => cart.remove(i.id)}>✕</button></td>
              </tr>
            ))}
            <tr><td colSpan={2} className="num">Tạm tính</td><td className="num">{vnd(cart.total)}</td><td /></tr>
            <tr><td colSpan={2} className="num">Vận chuyển {ship === 0 && <span className="chip green">Miễn phí</span>}</td><td className="num">{vnd(ship)}</td><td /></tr>
            <tr><td colSpan={2} className="num"><strong>Tổng</strong></td><td className="num"><strong className="gold" style={{ fontSize: '1.1rem' }}>{vnd(cart.total + ship)}</strong></td><td /></tr>
          </tbody>
        </table>
      </section>

      <form className="card" onSubmit={submit}>
        <h2>Thông tin giao hàng</h2>
        <label className="field"><span>Họ tên *</span><input className="input" required value={form.full_name} onChange={set('full_name')} /></label>
        <label className="field"><span>Số điện thoại *</span><input className="input" required pattern="0[0-9]{9}" value={form.phone} onChange={set('phone')} /></label>
        <label className="field"><span>Email</span><input className="input" type="email" value={form.email} onChange={set('email')} /></label>
        <label className="field"><span>Địa chỉ *</span><input className="input" required value={form.address} onChange={set('address')} /></label>
        <label className="field"><span>Ghi chú</span><textarea className="input" rows={2} value={form.note} onChange={set('note')} /></label>
        {err && <div className="alert err">{err}</div>}
        <button className="btn" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Đang xử lý…' : `Đặt hàng · ${vnd(cart.total + ship)}`}</button>
        <p className="muted" style={{ fontSize: '.8rem', marginTop: 10 }}>Đơn hàng được xử lý trong 1 transaction PostgreSQL (<code>place_order</code>): khoá dòng sản phẩm bằng <code>SELECT … FOR UPDATE</code>, kiểm tra tồn kho, tạo đơn, trừ kho.</p>
      </form>
    </div>
  );
}
