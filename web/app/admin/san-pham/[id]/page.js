'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { fmtDate, ATTR_LABEL } from '@/lib/api';
import { adminApi, useLoad } from '@/lib/admin';

const EMPTY = { sku: '', name: '', category_id: '', price: '', stock: 0, status: 'active', image_url: '/img/nhan.svg', description: '', attributes: { metal: 'Vàng 18K' } };

export default function ProductForm({ params }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const { data: cats } = useLoad(() => adminApi('/api/admin/categories'));
  const { data: loaded, reload } = useLoad(() => (isNew ? Promise.resolve(null) : adminApi(`/api/admin/products/${id}`)), [id]);
  const [f, setF] = useState(EMPTY);
  const [attrKey, setAttrKey] = useState('');
  const [attrVal, setAttrVal] = useState('');
  const [delta, setDelta] = useState(10);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (loaded) setF(loaded); }, [loaded]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addAttr = () => {
    if (!attrKey) return;
    let v = attrVal;
    if (v === 'true') v = true; else if (v === 'false') v = false; else if (v !== '' && !isNaN(v)) v = Number(v);
    setF({ ...f, attributes: { ...f.attributes, [attrKey]: v } });
    setAttrKey(''); setAttrVal('');
  };
  const delAttr = (k) => { const a = { ...f.attributes }; delete a[k]; setF({ ...f, attributes: a }); };

  const save = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      const body = { ...f, price: Number(f.price), stock: Number(f.stock), category_id: Number(f.category_id) };
      const r = isNew ? await adminApi('/api/admin/products', { method: 'POST', body }) : await adminApi(`/api/admin/products/${id}`, { method: 'PUT', body });
      if (isNew) window.location.href = `/admin/san-pham/${r.id}`;
      else { setMsg('Đã lưu. search_vec (generated column) và embedding (pgvector) được cập nhật.'); reload(); }
    } catch (e) { setMsg('Lỗi: ' + e.message); }
  };
  const importStock = async () => {
    try {
      const r = await adminApi(`/api/admin/products/${id}/stock`, { method: 'POST', body: { delta: Number(delta) } });
      setMsg(`Tồn kho mới: ${r.stock} (UPDATE + INSERT stock_movements trong 1 transaction)`); reload();
    } catch (e) { setMsg('Lỗi: ' + e.message); }
  };

  return (
    <>
      <Link href="/admin/san-pham" className="muted">← Sản phẩm</Link>
      <h1>{isNew ? 'Thêm sản phẩm' : f.name}</h1>
      {msg && <div className={`alert ${msg.startsWith('Lỗi') ? 'err' : 'ok'}`}>{msg}</div>}
      <form onSubmit={save} className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Thông tin</h3>
          <div className="grid grid-2">
            <label className="field"><span>SKU *</span><input className="input" value={f.sku} onChange={set('sku')} required disabled={!isNew} /></label>
            <label className="field"><span>Danh mục *</span>
              <select className="input" value={f.category_id} onChange={set('category_id')} required>
                <option value="">— chọn —</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
          </div>
          <label className="field"><span>Tên *</span><input className="input" value={f.name} onChange={set('name')} required /></label>
          <div className="grid grid-3">
            <label className="field"><span>Giá (VNĐ) *</span><input className="input" type="number" value={f.price} onChange={set('price')} required /></label>
            <label className="field"><span>Tồn kho {!isNew && '(sửa ở ô nhập kho)'}</span><input className="input" type="number" value={f.stock} onChange={set('stock')} disabled={!isNew} /></label>
            <label className="field"><span>Trạng thái</span>
              <select className="input" value={f.status} onChange={set('status')}><option value="active">active</option><option value="hidden">hidden</option><option value="discontinued">discontinued</option></select></label>
          </div>
          <label className="field"><span>Ảnh (URL)</span><input className="input" value={f.image_url || ''} onChange={set('image_url')} /></label>
          <label className="field"><span>Mô tả</span><textarea className="input" rows={4} value={f.description || ''} onChange={set('description')} /></label>
          <button className="btn">{isNew ? 'Tạo sản phẩm' : 'Lưu thay đổi'}</button>
        </div>

        <div>
          <div className="card">
            <div className="row between"><h3>Thuộc tính linh hoạt</h3><span className="muted mode-tag">JSONB</span></div>
            <p className="muted" style={{ fontSize: '.85rem' }}>Mỗi loại trang sức có thuộc tính khác nhau (ni nhẫn, chiều dài dây, carat…) — thêm tuỳ ý, không cần sửa bảng.</p>
            <table className="tbl">
              <tbody>
                {Object.entries(f.attributes || {}).map(([k, v]) => (
                  <tr key={k}><td><strong>{ATTR_LABEL[k] || k}</strong> <span className="muted">({k})</span></td><td>{String(v)}</td><td><button type="button" className="btn ghost sm" onClick={() => delAttr(k)}>✕</button></td></tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 10 }}>
              <input className="input" style={{ width: 140 }} list="attr-keys" placeholder="khoá (metal…)" value={attrKey} onChange={(e) => setAttrKey(e.target.value)} />
              <datalist id="attr-keys">{Object.keys(ATTR_LABEL).map((k) => <option key={k} value={k}>{ATTR_LABEL[k]}</option>)}</datalist>
              <input className="input" style={{ width: 160 }} placeholder="giá trị" value={attrVal} onChange={(e) => setAttrVal(e.target.value)} />
              <button type="button" className="btn sm ghost" onClick={addAttr}>Thêm</button>
            </div>
            <pre className="code" style={{ marginTop: 12 }}>{JSON.stringify(f.attributes, null, 2)}</pre>
          </div>

          {!isNew && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Kho</h3>
              <div className="row">
                <span>Tồn hiện tại: <strong>{loaded?.stock}</strong></span>
                <input className="input" type="number" style={{ width: 90 }} value={delta} onChange={(e) => setDelta(e.target.value)} />
                <button type="button" className="btn sm blue" onClick={importStock}>Nhập/điều chỉnh kho</button>
              </div>
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead><tr><th>Thời gian</th><th>Lý do</th><th className="num">±</th><th>Đơn</th></tr></thead>
                <tbody>{loaded?.movements?.map((m, i) => <tr key={i}><td>{fmtDate(m.created_at)}</td><td>{m.reason}</td><td className="num">{m.delta > 0 ? '+' : ''}{m.delta}</td><td>{m.ref_id ? `#${m.ref_id}` : ''}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </form>
    </>
  );
}
