import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams,
         useSearchParams, Navigate, useLocation } from 'react-router-dom';
import api from './api/client.js';
import { useAuth, useCart } from './store/index.js';
import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { ToastContainer } from './components/Toast.jsx';
import Protected from './components/Protected.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const count = useCart(s => s.count());
  const toggle = useCart(s => s.toggle);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = e => {
    e.preventDefault();
    if (search.trim()) { navigate(`/products?search=${encodeURIComponent(search)}`); setSearch(''); }
  };

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="page" style={{ display: 'flex', alignItems: 'center', gap: 20, height: 64 }}>
        <Link to="/" style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
          NOV<span style={{ color: 'var(--accent)' }}>A</span>
        </Link>

        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 420 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Пошук товарів…"
            style={{ background: 'var(--surface2)', height: 38, borderRadius: 8 }} />
        </form>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/products" className="btn btn-ghost btn-sm">Каталог</Link>

          {user ? (
            <>
              <Link to="/orders" className="btn btn-ghost btn-sm">Замовлення</Link>
              {user.role === 'admin' && <Link to="/admin" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>Admin</Link>}
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>Вийти</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline btn-sm">Увійти</Link>
          )}

          <button className="btn btn-primary btn-sm" onClick={toggle} style={{ position: 'relative' }}>
            🛒
            {count > 0 && (
              <span style={{
                position: 'absolute', top: -8, right: -8, background: 'var(--danger)',
                color: '#fff', borderRadius: '50%', width: 18, height: 18,
                fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              }}>{count}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function CartDrawer() {
  const { items, open, close, updateItem, removeItem } = useCart();
  const total = useCart(s => s.total());
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <>
      <div onClick={close} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200
      }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, maxWidth: '100vw',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        animation: 'slideIn .25s ease',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18 }}>Кошик ({items.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={close}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 60 }}>Кошик порожній</p>}
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--surface2)', borderRadius: 10 }}>
              <img src={item.image_urls?.[0]} alt={item.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{item.name}</div>
                <div style={{ color: 'var(--accent)', fontWeight: 600 }}>${Number(item.unit_price).toFixed(2)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}
                    onClick={() => updateItem(item.id, item.quantity - 1)}>−</button>
                  <span style={{ fontSize: 14 }}>{item.quantity}</span>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}
                    onClick={() => updateItem(item.id, item.quantity + 1)}>+</button>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--danger)' }}
                    onClick={() => removeItem(item.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontFamily: 'var(--font-head)', fontSize: 18 }}>
            <span>Разом:</span>
            <span style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</span>
          </div>
          {user ? (
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={items.length === 0}
              onClick={() => { close(); navigate('/checkout'); }}>
              Оформити замовлення →
            </button>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%' }}
              onClick={() => { close(); navigate('/login'); }}>
              Увійти для замовлення
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ProductCard moved to ./components/ProductCard.jsx

// HomePage moved to ./pages/HomePage.jsx

// CatalogPage moved to ./pages/CatalogPage.jsx

// ProductPage moved to ./pages/ProductPage.jsx

// CheckoutPage moved to ./pages/CheckoutPage.jsx

// OrdersPage moved to ./pages/OrdersPage.jsx

// ═══════════════════════════════════════════════════════════════
// ORDER DETAIL PAGE
// ═══════════════════════════════════════════════════════════════
// OrderDetailPage moved to ./pages/OrderDetailPage.jsx

// AuthPage moved to ./pages/AuthPage.jsx

// AdminPage moved to ./pages/AdminPage.jsx

// Protected wrapper moved to ./components/Protected.jsx

// ═══════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const { init, loading } = useAuth();
  const { fetchCart }     = useCart();

  useEffect(() => {
    init().then(fetchCart);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <BrowserRouter>
      <Navbar />
      <CartDrawer />
      <ToastContainer />
      <main>
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/products"    element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/login"       element={<AuthPage mode="login" />} />
          <Route path="/register"    element={<AuthPage mode="register" />} />
          <Route path="/checkout"    element={<Protected><CheckoutPage /></Protected>} />
          <Route path="/orders"      element={<Protected><OrdersPage /></Protected>} />
          <Route path="/orders/:id"  element={<Protected><OrderDetailPage /></Protected>} />
          <Route path="/admin"       element={<Protected><AdminPage /></Protected>} />
          <Route path="*"            element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
