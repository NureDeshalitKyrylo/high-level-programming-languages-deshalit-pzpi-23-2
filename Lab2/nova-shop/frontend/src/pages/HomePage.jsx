import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../store/index.js';
import ProductCard from '../components/ProductCard.jsx';

export default function HomePage() {
  const [featured, setFeatured]           = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories]       = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/products?featured=true&limit=8').then(r => setFeatured(r.data.items));
    api.get('/categories').then(r => setCategories(r.data));
    if (user) api.get('/recommendations').then(r => setRecommendations(r.data)).catch(() => {});
  }, [user]);

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--surface) 0%, #0f0f1a 50%, var(--bg) 100%)',
        borderBottom: '1px solid var(--border)', padding: '80px 0 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(124,92,252,.15) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div className="page" style={{ position: 'relative' }}>
          <div className="badge badge-accent" style={{ marginBottom: 20 }}>Нова колекція 2025</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 20 }}>
            Магазин<br /><span style={{ color: 'var(--accent)' }}>майбутнього</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 18, maxWidth: 480, marginBottom: 36 }}>
            Преміальні товари з персоналізованими рекомендаціями та миттєвою доставкою
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/products')}>Переглянути каталог</button>
            {!user && <button className="btn btn-outline" onClick={() => navigate('/register')}>Зареєструватись</button>}
          </div>
        </div>
      </div>

      <div className="page" style={{ padding: '48px 24px' }}>
        {/* Categories */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Категорії</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {categories.filter(c => !c.parent_id).map(c => (
              <button key={c.id} className="card btn" style={{ padding: '12px 20px', display: 'flex', gap: 8, alignItems: 'center' }}
                onClick={() => navigate(`/products?category=${c.slug}`)}>
                <span>{c.name}</span>
                <span className="badge badge-muted">{c.product_count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700 }}>Рекомендовано для вас</h2>
              <span className="badge badge-purple">✨ AI</span>
            </div>
            <div className="grid-products">
              {recommendations.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Featured */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Особливі пропозиції</h2>
          <div className="grid-products">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
