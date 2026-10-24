'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { vnd } from '@/lib/api';
import { adminApi, useLoad } from '@/lib/admin';

export default function Dashboard() {
  const { data, loading, error, reload } = useLoad(() => adminApi('/api/admin/dashboard'));
  const [refreshing, setRefreshing] = useState(null);

  // Có đơn mới (NOTIFY) -> tải lại số liệu hôm nay
  useEffect(() => {
    const h = () => reload();
    window.addEventListener('new_order', h);
    return () => window.removeEventListener('new_order', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    const r = await adminApi('/api/admin/reports/refresh', { method: 'POST' });
    setRefreshing(`REFRESH MATERIALIZED VIEW CONCURRENTLY ×3: ${r.ms} ms`);
    reload();
  };

  if (error) return <div className="alert err">{error}</div>;
  if (loading || !data) return <p className="muted">Đang tải…</p>;

  const maxRev = Math.max(...data.daily.map((d) => d.revenue), 1);
  const months = [...new Set(data.byCategory.map((r) => r.month))];
  const catNames = [...new Set(data.byCategory.map((r) => r.category))];

  return (
    <>
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Tổng quan</h1>
        <div className="row">
          <span className="muted" style={{ fontSize: '.85rem' }}>{refreshing || 'Báo cáo từ materialized view'}</span>
          <button className="btn sm ghost" onClick={refresh}>↻ Refresh báo cáo</button>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="stat"><div className="label">Đơn hôm nay</div><div className="value">{data.today.orders}</div><span className="muted" style={{ fontSize: '.8rem' }}>real-time, partition tháng này</span></div>
        <div className="stat"><div className="label">Doanh thu hôm nay</div><div className="value">{vnd(data.today.revenue)}</div></div>
        <div className="stat"><div className="label">Đơn chờ xử lý</div><div className="value">{data.pending}</div><span className="muted" style={{ fontSize: '.8rem' }}>partial index idx_orders_pending</span></div>
        <div className="stat"><div className="label">Sắp hết hàng</div><div className="value" style={{ color: data.lowStock.length ? 'var(--red)' : undefined }}>{data.lowStock.length}</div><span className="muted" style={{ fontSize: '.8rem' }}>partial index stock &lt; 3</span></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="row between"><h3>Doanh thu 30 ngày</h3><span className="muted mode-tag">mv_sales_daily</span></div>
          <div className="bars">
            {data.daily.map((d) => <div key={d.day} style={{ height: `${(d.revenue / maxRev) * 100}%` }} data-tip={`${new Date(d.day).toLocaleDateString('vi-VN')}: ${vnd(d.revenue)} · ${d.orders} đơn`} />)}
          </div>
        </div>
        <div className="card">
          <div className="row between"><h3>Doanh thu theo danh mục (6 tháng)</h3><span className="muted mode-tag">mv_sales_by_category_month</span></div>
          <table className="tbl">
            <thead><tr><th>Tháng</th>{catNames.map((c) => <th key={c} className="num" style={{ fontSize: '.7rem' }}>{c}</th>)}</tr></thead>
            <tbody>
              {months.map((m) => (
                <tr key={m}><td>{new Date(m).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</td>
                  {catNames.map((c) => { const r = data.byCategory.find((x) => x.month === m && x.category === c); return <td key={c} className="num">{r ? (r.revenue / 1e9).toFixed(2) + ' tỷ' : '–'}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="row between"><h3>Top sản phẩm bán chạy</h3><span className="muted mode-tag">mv_top_products</span></div>
          <table className="tbl">
            <thead><tr><th>Sản phẩm</th><th className="num">Đã bán</th><th className="num">Doanh thu</th></tr></thead>
            <tbody>{data.top.map((p) => <tr key={p.product_id}><td><Link href={`/admin/san-pham/${p.product_id}`}>{p.name}</Link><br /><span className="muted">{p.category}</span></td><td className="num">{p.qty_sold}</td><td className="num">{vnd(p.revenue)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <div className="row between"><h3>Sắp hết hàng</h3><span className="muted mode-tag">v_low_stock_products</span></div>
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Sản phẩm</th><th className="num">Tồn</th></tr></thead>
            <tbody>{data.lowStock.map((p) => <tr key={p.id}><td>{p.sku}</td><td><Link href={`/admin/san-pham/${p.id}`}>{p.name}</Link></td><td className="num"><span className={`chip ${p.stock === 0 ? 'red' : ''}`}>{p.stock}</span></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
