import Link from 'next/link';
import { api, vnd, fmtDate, STATUS_LABEL } from '@/lib/api';

export default async function OrderPage({ params, searchParams }) {
  const { id } = await params;
  const { phone = '', new: isNew } = await searchParams;
  let o = null, err = null;
  try { o = await api(`/api/orders/${id}?phone=${encodeURIComponent(phone)}`); } catch (e) { err = e.message; }
  if (err) return <section className="section"><div className="alert err">{err}</div><Link href="/tra-cuu" className="btn ghost">Tra cứu lại</Link></section>;
  return (
    <section className="section" style={{ maxWidth: 760 }}>
      {isNew && <div className="alert ok">Đặt hàng thành công! Chúng tôi sẽ gọi xác nhận trong 30 phút.</div>}
      <h1>Đơn hàng #{o.id} <span className="chip blue">{STATUS_LABEL[o.status]}</span></h1>
      <p className="muted">Đặt lúc {fmtDate(o.created_at)} · {o.customer_name} · {o.customer_phone} · {o.customer_address}</p>
      <table className="tbl">
        <thead><tr><th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.product_id}><td><Link href={`/san-pham/${i.slug}`} className="row"><img src={i.image_url} width={40} style={{ borderRadius: 6 }} alt="" />{i.name}</Link></td>
              <td className="num">{i.qty}</td><td className="num">{vnd(i.unit_price)}</td><td className="num">{vnd(i.line_total)}</td></tr>
          ))}
          <tr><td colSpan={3} className="num">Phí vận chuyển</td><td className="num">{vnd(o.shipping_fee)}</td></tr>
          <tr><td colSpan={3} className="num"><strong>Tổng cộng</strong></td><td className="num"><strong className="gold">{vnd(o.total)}</strong></td></tr>
        </tbody>
      </table>
      {o.note && <p className="muted">Ghi chú: {o.note}</p>}
    </section>
  );
}
