'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LookupPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <section className="section" style={{ maxWidth: 480 }}>
      <h1>Tra cứu đơn hàng</h1>
      <form onSubmit={(e) => { e.preventDefault(); router.push(`/don-hang/${id}?phone=${encodeURIComponent(phone)}`); }}>
        <label className="field"><span>Mã đơn hàng</span><input className="input" value={id} onChange={(e) => setId(e.target.value)} required /></label>
        <label className="field"><span>Số điện thoại đặt hàng</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
        <button className="btn">Tra cứu</button>
      </form>
    </section>
  );
}
