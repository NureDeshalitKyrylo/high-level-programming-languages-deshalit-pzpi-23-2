import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useCart } from '../store/index.js';
import { useAuth } from '../store/index.js';
import { toast } from '../components/Toast.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty]         = useState(1);
  const [adding, setAdding]   = useState(false);
  const [img, setImg]         = useState(0);
  const { addItem } = useCart();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`).then(r => setProduct(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  const handleAdd = async () => {
    if (!user) { navigate('/login'); return; }
    setAdding(true);
    try { await addItem(product.id, qty); toast('Додано до кошика'); }
    catch (e) { toast(e.response?.data?.error || 'Помилка', 'error'); }
    finally { setAdding(false); }
  };

  if (loading) return <div className="spinner" />;
  if (!product) return <div className="page" style={{ padding: 60, color: 'var(--muted)' }}>Товар не знайдено</div>;

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100) : null;

  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
        {/* Images */}
        <div style={{ flex: '0 0 480px', maxWidth: '100%' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, height: 400 }}>
            <img src={product.image_urls?.[img]} alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {product.image_urls?.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {product.image_urls.map((url, i) => (
                <img key={i} src={url} alt="" onClick={() => setImg(i)}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${i === img ? 'var(--accent)' : 'transparent'}` }} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>{product.category_name}</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            {product.name}
          </h1>

          {product.avg_rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span style={{ color: '#ffc400' }}>{'★'.repeat(Math.round(product.avg_rating))}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>({product.review_count} відгуків)</span>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 800, color: 'var(--accent)' }}>
              ${Number(product.price).toFixed(2)}
            </span>
            {discount && (
              <>
                <span style={{ fontSize: 16, color: 'var(--muted)', textDecoration: 'line-through', marginLeft: 12 }}>
                  ${Number(product.compare_price).toFixed(2)}
                </span>
                <span className="badge badge-accent" style={{ marginLeft: 10 }}>-{discount}%</span>
              </>
            )}
          </div>

          <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>{product.description}</p>

          {product.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {product.tags.map(t => (
                <Link key={t.id} to={`/products?tag=${t.slug}`} className="tag">#{t.name}</Link>
              ))}
            </div>
          )}

          {product.stock_qty > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: 'var(--muted)' }}>Кількість:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 8, padding: '4px 8px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <span style={{ width: 24, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setQty(q => Math.min(product.stock_qty, q + 1))}>+</button>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>в наявності: {product.stock_qty}</span>
              </div>
              <button className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}
                onClick={handleAdd} disabled={adding}>
                {adding ? 'Додаємо…' : 'Додати до кошика 🛒'}
              </button>
            </>
          ) : (
            <div style={{ padding: '12px 20px', background: 'var(--surface2)', borderRadius: 8, color: 'var(--muted)' }}>
              Немає в наявності
            </div>
          )}

          <div style={{ marginTop: 28, padding: 16, background: 'var(--surface2)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>SKU: {product.sku}</div>
            {product.weight_kg && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Вага: {product.weight_kg} кг</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
