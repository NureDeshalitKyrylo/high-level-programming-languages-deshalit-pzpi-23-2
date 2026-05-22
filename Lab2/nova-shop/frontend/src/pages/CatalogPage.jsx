import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';

export default function CatalogPage() {
  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [categories, setCategories] = useState([]);
  const [tags, setTags]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const page     = Number(searchParams.get('page')     || 1);
  const search   = searchParams.get('search')    || '';
  const category = searchParams.get('category')  || '';
  const tag      = searchParams.get('tag')       || '';
  const sort     = searchParams.get('sort')      || 'created_at';
  const order    = searchParams.get('order')     || 'desc';
  const LIMIT    = 12;

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
    api.get('/products?limit=0').then(r => {
      // extract unique tags from first fetch
    });
    // get all tags
    api.get('/products?limit=100').then(r => {
      const all = r.data.items.flatMap(p => p.tags || []);
      setTags([...new Set(all)].sort());
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT, sort, order });
    if (search)   params.set('search',   search);
    if (category) params.set('category', category);
    if (tag)      params.set('tag',      tag);

    api.get(`/products?${params}`).then(r => {
      setProducts(r.data.items);
      setTotal(r.data.total);
    }).finally(() => setLoading(false));
  }, [page, search, category, tag, sort, order]);

  const set = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    if (key !== 'page') p.delete('page');
    setSearchParams(p);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page" style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', gap: 28 }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 16, fontSize: 15 }}>Фільтри</h3>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Категорія</div>
            <button className={`tag ${!category ? 'active' : ''}`} style={{ marginBottom: 6, display: 'block' }} onClick={() => set('category', '')}>Всі</button>
            {categories.filter(c => !c.parent_id).map(c => (
              <button key={c.id} className={`tag ${category === c.slug ? 'active' : ''}`}
                style={{ marginBottom: 6, display: 'block' }} onClick={() => set('category', c.slug)}>
                {c.name}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Теги</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tags.map(t => (
                <button key={t} className={`tag ${tag === t ? 'active' : ''}`} onClick={() => set('tag', tag === t ? '' : t)}>#{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Сортування</div>
            {[['created_at,desc','Новинки'],['price,asc','Ціна ↑'],['price,desc','Ціна ↓'],['name,asc','Назва A-Z']].map(([v, l]) => {
              const [s, o] = v.split(',');
              return (
                <button key={v} className={`tag ${sort === s && order === o ? 'active' : ''}`}
                  style={{ marginBottom: 6, display: 'block' }}
                  onClick={() => { set('sort', s); set('order', o); }}>{l}</button>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800 }}>
              {search ? `Пошук: "${search}"` : 'Каталог'}
            </h1>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{total} товарів</span>
          </div>

          {loading ? <div className="spinner" /> : (
            <>
              <div className="grid-products">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              {products.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Товарів не знайдено</p>}

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-outline'} btn-sm`}
                      onClick={() => set('page', p)}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
