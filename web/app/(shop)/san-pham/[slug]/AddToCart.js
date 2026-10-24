'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart';

export default function AddToCart({ p }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  if (p.stock === 0) return <button className="btn" disabled>Hết hàng</button>;
  return (
    <div className="row" style={{ marginTop: 10 }}>
      <input type="number" className="input" style={{ width: 80 }} min={1} max={p.stock} value={qty}
             onChange={(e) => setQty(Math.min(p.stock, Math.max(1, Number(e.target.value))))} />
      <button className="btn" onClick={() => { cart.add(p, qty); setDone(true); setTimeout(() => setDone(false), 1500); }}>
        {done ? '✓ Đã thêm' : 'Thêm vào giỏ'}
      </button>
    </div>
  );
}
