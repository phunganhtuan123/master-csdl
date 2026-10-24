'use client';
import { useState } from 'react';
import { adminApi, useLoad } from '@/lib/admin';

export default function MonitorPage() {
  const [tab, setTab] = useState('bench');
  return (
    <>
      <h1>Monitor & Benchmark PostgreSQL</h1>
      <div className="tabs">
        {[['bench', 'Benchmark index (EXPLAIN ANALYZE)'], ['overview', 'Bảng · Index · Partition'], ['stmt', 'pg_stat_statements']].map(([k, t]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      {tab === 'bench' && <Bench />}
      {tab === 'overview' && <Overview />}
      {tab === 'stmt' && <Statements />}
    </>
  );
}

/* ---------------- EXPLAIN ANALYZE có index vs không index ---------------- */
function Bench() {
  const { data: demos } = useLoad(() => adminApi('/api/admin/monitor/demos'));
  const [key, setKey] = useState('jsonb_gin');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (k) => {
    setKey(k); setBusy(true); setRes(null);
    try { setRes(await adminApi(`/api/admin/monitor/explain/${k}`)); } finally { setBusy(false); }
  };
  const speedup = res ? (res.without_index.execution_ms / Math.max(res.with_index.execution_ms, 0.001)).toFixed(1) : null;
  return (
    <div className="grid" style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
      <div className="card">
        <h3>Chọn kịch bản</h3>
        {demos?.map((d) => (
          <button key={d.key} className={`btn sm ${key === d.key ? '' : 'ghost'}`} style={{ display: 'flex', width: '100%', marginBottom: 6, textAlign: 'left' }} onClick={() => run(d.key)}>{d.title}</button>
        ))}
        <p className="muted" style={{ fontSize: '.8rem' }}>Mỗi kịch bản chạy EXPLAIN ANALYZE 3 lần lấy lần nhanh nhất; cột phải tắt index bằng <code>SET LOCAL enable_… = off</code> để planner phải quét bảng.</p>
      </div>
      <div>
        {busy && <p className="muted">Đang chạy EXPLAIN ANALYZE…</p>}
        {!res && !busy && <div className="alert info">Chọn 1 kịch bản bên trái để chạy.</div>}
        {res && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>{res.title}</h3>
              <pre className="code">{res.sql}</pre>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="chip green">Có index: <strong>{res.with_index.execution_ms.toFixed(3)} ms</strong></span>
                <span className="chip red">{res.without_index.label}: <strong>{res.without_index.execution_ms.toFixed(3)} ms</strong></span>
                <span className="ms gold">nhanh hơn {speedup}×</span>
              </div>
            </div>
            <div className="compare">
              <div className="card"><h3 style={{ color: 'var(--green)' }}>✓ Dùng index</h3><pre className="code">{res.with_index.plan_text}</pre></div>
              <div className="card"><h3 style={{ color: 'var(--red)' }}>✗ {res.without_index.label}</h3><pre className="code">{res.without_index.plan_text}</pre></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Bảng, index, partition ---------------- */
function Overview() {
  const { data, loading } = useLoad(() => adminApi('/api/admin/monitor/overview'));
  if (loading || !data) return <p className="muted">Đang tải…</p>;
  return (
    <>
      <div className="grid grid-4">
        <div className="stat"><div className="label">PostgreSQL</div><div className="value" style={{ fontSize: '1rem' }}>{data.version.split(' on ')[0]}</div></div>
        <div className="stat"><div className="label">Dung lượng DB</div><div className="value">{data.db_size}</div></div>
        <div className="stat"><div className="label">Kết nối</div><div className="value">{data.connections.total} <span className="muted" style={{ fontSize: '.9rem' }}>({data.connections.active} active)</span></div></div>
        <div className="stat"><div className="label">Partition orders</div><div className="value">{data.partitions.length}</div></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <h3>Bảng</h3>
          <table className="tbl">
            <thead><tr><th>Bảng</th><th className="num">Dòng</th><th className="num">Data</th><th className="num">Index</th><th className="num">Seq scan</th><th className="num">Idx scan</th></tr></thead>
            <tbody>{data.tables.map((t) => <tr key={t.table}><td>{t.table}</td><td className="num">{t.rows.toLocaleString('vi-VN')}</td><td className="num">{t.table_size}</td><td className="num">{t.index_size}</td><td className="num">{t.seq_scan}</td><td className="num">{t.idx_scan.toLocaleString('vi-VN')}</td></tr>)}</tbody>
          </table>
          <h3 style={{ marginTop: 20 }}>Partition của orders (theo tháng)</h3>
          <table className="tbl">
            <thead><tr><th>Partition</th><th className="num">Dòng</th><th className="num">Size</th></tr></thead>
            <tbody>{data.partitions.map((p) => <tr key={p.partition}><td>{p.partition}</td><td className="num">{p.rows.toLocaleString('vi-VN')}</td><td className="num">{p.size}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <h3>Index</h3>
          <table className="tbl">
            <thead><tr><th>Index</th><th>Bảng</th><th>Loại</th><th className="num">Size</th><th className="num">Lượt dùng</th></tr></thead>
            <tbody>{data.indexes.map((i) => <tr key={i.index}><td style={{ fontFamily: 'var(--mono)', fontSize: '.78rem' }}>{i.index}</td><td>{i.table}</td><td><span className={`chip ${i.type === 'btree' ? 'gray' : i.type === 'gin' ? 'blue' : i.type === 'hnsw' ? '' : 'green'}`}>{i.type}</span></td><td className="num">{i.size}</td><td className="num">{i.scans.toLocaleString('vi-VN')}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------------- pg_stat_statements ---------------- */
function Statements() {
  const [order, setOrder] = useState('time');
  const { data, loading, reload } = useLoad(() => adminApi(`/api/admin/monitor/statements?order=${order}`), [order]);
  return (
    <div className="card">
      <div className="row between">
        <h3>Top câu SQL (pg_stat_statements)</h3>
        <div className="row">
          <button className={`btn sm ${order === 'time' ? '' : 'ghost'}`} onClick={() => setOrder('time')}>Theo tổng thời gian</button>
          <button className={`btn sm ${order === 'calls' ? '' : 'ghost'}`} onClick={() => setOrder('calls')}>Theo số lần gọi</button>
          <button className="btn sm ghost" onClick={async () => { await adminApi('/api/admin/monitor/statements/reset', { method: 'POST' }); reload(); }}>Reset</button>
        </div>
      </div>
      {loading ? <p className="muted">Đang tải…</p> : (
        <table className="tbl">
          <thead><tr><th>Câu SQL</th><th className="num">Gọi</th><th className="num">Tổng ms</th><th className="num">TB ms</th><th className="num">Dòng</th><th className="num">Cache hit</th></tr></thead>
          <tbody>{data?.map((r, i) => <tr key={i}><td style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', whiteSpace: 'pre-wrap' }}>{r.query}</td><td className="num">{r.calls}</td><td className="num">{r.total_ms}</td><td className="num">{r.mean_ms}</td><td className="num">{r.rows}</td><td className="num">{r.cache_hit_pct ?? '–'}%</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
