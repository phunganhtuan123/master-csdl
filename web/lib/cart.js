'use client';
// Giỏ hàng lưu trong localStorage (chưa đặt hàng thì chưa cần ghi vào DB)
import { createContext, useContext, useEffect, useState } from 'react';

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem('cart') || '[]')); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem('cart', JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const add = (p, qty = 1) => setItems((cur) => {
    const i = cur.findIndex((x) => x.id === p.id);
    if (i >= 0) return cur.map((x, k) => (k === i ? { ...x, qty: Math.min(x.qty + qty, p.stock) } : x));
    return [...cur, { id: p.id, slug: p.slug, name: p.name, price: p.price, image_url: p.image_url, stock: p.stock, qty }];
  });
  const setQty = (id, qty) => setItems((cur) => cur.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const remove = (id) => setItems((cur) => cur.filter((x) => x.id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.qty * x.price, 0);

  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, count, total, ready }}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
