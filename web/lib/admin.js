'use client';
import { useEffect, useState } from 'react';
import { api } from './api';

export const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);

/** Gọi API admin kèm token; 401 -> về trang đăng nhập */
export async function adminApi(path, opts = {}) {
  try {
    return await api(path, { ...opts, token: getToken() });
  } catch (e) {
    if (/Chưa đăng nhập/.test(e.message) && typeof window !== 'undefined') window.location.href = '/admin/login';
    throw e;
  }
}

/** Hook tải dữ liệu đơn giản: const { data, loading, error, reload } = useLoad(() => adminApi('/api/...'), [deps]) */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ data, loading: false, error: null }))
        .catch((e) => alive && setState({ data: null, loading: false, error: e.message }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
