'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function AdminLogin() {
  const [u, setU] = useState('admin');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/api/admin/login', { method: 'POST', body: { username: u, password: p } });
      localStorage.setItem('admin_token', r.token);
      window.location.href = '/admin';
    } catch (e) { setErr(e.message); }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form className="card" style={{ width: 360 }} onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 16 }}>AN THƯ<small>QUẢN TRỊ</small></div>
        <label className="field"><span>Tài khoản</span><input className="input" value={u} onChange={(e) => setU(e.target.value)} /></label>
        <label className="field"><span>Mật khẩu</span><input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="admin123" /></label>
        {err && <div className="alert err">{err}</div>}
        <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>Đăng nhập</button>
      </form>
    </div>
  );
}
