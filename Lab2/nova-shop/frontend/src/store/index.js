import { create } from 'zustand';
import api from '../api/client.js';

// ── AUTH ──────────────────────────────────────────────────────
export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    if (!localStorage.getItem('accessToken')) return set({ loading: false });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    return data.user;
  },

  register: async (email, password, full_name) => {
    const { data } = await api.post('/auth/register', { email, password, full_name });
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },
}));

// ── CART ──────────────────────────────────────────────────────
export const useCart = create((set, get) => ({
  items: [],
  open:  false,

  toggle: () => set(s => ({ open: !s.open })),
  close:  () => set({ open: false }),

  fetchCart: async () => {
    if (!localStorage.getItem('accessToken')) return;
    try {
      const { data } = await api.get('/cart');
      set({ items: data });
      // refresh totals from server when we have items
      get().fetchTotals().catch(() => {});
    } catch {}
  },

  addItem: async (product_id, quantity = 1) => {
    const { data } = await api.post('/cart/items', { product_id, quantity });
    set({ items: data, open: true });
    get().fetchTotals().catch(() => {});
  },

  updateItem: async (id, quantity) => {
    const { data } = await api.patch(`/cart/items/${id}`, { quantity });
    set({ items: data });
    get().fetchTotals().catch(() => {});
  },

  removeItem: async (id) => {
    const { data } = await api.delete(`/cart/items/${id}`);
    set({ items: data });
    get().fetchTotals().catch(() => {});
  },

  clearCart: async () => {
    await api.delete('/cart');
    set({ items: [] });
    set({ serverTotals: null });
  },

  serverTotals: null,

  fetchTotals: async () => {
    if (!localStorage.getItem('accessToken')) return;
    try {
      const { data } = await api.get('/cart/total');
      // data can be { total, count } or a number
      if (data && typeof data === 'object') set({ serverTotals: data });
      else set({ serverTotals: { total: Number(data) || 0, count: null } });
    } catch {
      set({ serverTotals: null });
    }
  },

  total: () => {
    const srv = get().serverTotals;
    if (srv && typeof srv.total !== 'undefined' && srv.total !== null) return Number(srv.total) || 0;
    return get().items.reduce((s, i) => {
      const price = parseFloat(String(i.unit_price).replace(/[^0-9.-]+/g, '')) || 0;
      const qty = Number(i.quantity) || 0;
      return s + price * qty;
    }, 0);
  },
  count: () => {
    const srv = get().serverTotals;
    if (srv && typeof srv.count !== 'undefined' && srv.count !== null) return Number(srv.count) || 0;
    return get().items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  },
}));
