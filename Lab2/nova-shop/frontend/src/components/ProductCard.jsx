import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../store/index.js';
import { useAuth } from '../store/index.js';
import { toast } from './Toast.jsx';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const handleAdd = async e => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setAdding(true);
    try { await addItem(product.id); toast('Додано до кошика'); }
    catch { toast('Помилка', 'error'); }
    finally { setAdding(false); }
  };

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100) : null;

  return (
    <Link to={`/products/${product.slug}`} className="card fade-in" style={{ display: 'block', transition: 'transform .2s, box-shadow .2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ position: 'relative', overflow: 'hidden', height: 220 }}>
        <img src={product.image_urls?.[0]} alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
          onMouseLeave={e => e.target.style.transform = ''} />
        {discount && <span className="badge badge-accent" style={{ position: 'absolute', top: 10, left: 10 }}>-{discount}%</span>}
        {product.stock_qty === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Немає в наявності</span>
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{product.category_name}</div>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 8, fontSize: 15, lineHeight: 1.3 }}>{product.name}</div>
        {product.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {product.tags.slice(0, 3).map(t => <span key={t} className="tag" style={{ fontSize: 10, padding: '1px 7px' }}>#{t}</span>)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
              ${Number(product.price).toFixed(2)}
            </span>
            {product.compare_price && (
              <span style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through', marginLeft: 6 }}>
                ${Number(product.compare_price).toFixed(2)}
              </span>
            )}
          </div>
          <button className="btn btn-primary btn-sm" disabled={adding || product.stock_qty === 0}
            onClick={handleAdd}>
            {adding ? '…' : '+'}
          </button>
        </div>
      </div>
    </Link>
  );
}
