import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import statusLabel from '../components/statusLabel.js';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner" />;
  if (!order)  return <div className="page" style={{ padding: 60 }}>Замовлення не знайдено</div>;

  const STEPS = ['pending','confirmed','processing','shipped','delivered'];
  const stepIdx = STEPS.indexOf(order.status);

  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800 }}>
            Замовлення #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>
            {new Date(order.created_at).toLocaleString('uk-UA')}
          </div>
        </div>
        <span className={`status status-${order.status}`} style={{ fontSize: 14, padding: '6px 16px' }}>
          {statusLabel(order.status)}
        </span>
      </div>

      {/* Progress tracker */}
      {!['cancelled','refunded'].includes(order.status) && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 14, left: 0, right: 0, height: 2,
              background: 'var(--border)',
            }} />
            <div style={{
              position: 'absolute', top: 14, left: 0, height: 2,
              width: `${Math.max(0, stepIdx) / (STEPS.length - 1) * 100}%`,
              background: 'var(--accent)', transition: 'width .5s ease',
            }} />
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i <= stepIdx ? 'var(--accent)' : 'var(--surface2)',
                  border: `2px solid ${i <= stepIdx ? 'var(--accent)' : 'var(--border)'}`,
                  color: i <= stepIdx ? '#000' : 'var(--muted)', fontWeight: 700, fontSize: 12,
                  transition: 'all .3s',
                }}>{i < stepIdx ? '✓' : i + 1}</div>
                <span style={{ fontSize: 11, color: i <= stepIdx ? 'var(--text)' : 'var(--muted)', marginTop: 6, textAlign: 'center' }}>
                  {statusLabel(s)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, flexWrap: 'wrap' }}>
        {/* Items */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 16 }}>Товари</h3>
          {order.items?.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>SKU: {item.sku} · {item.quantity} шт. × ${Number(item.unit_price).toFixed(2)}</div>
              </div>
              <div style={{ fontWeight: 600 }}>${Number(item.total_price).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>
            <span>Разом:</span>
            <span style={{ color: 'var(--accent)' }}>${Number(order.total_amount).toFixed(2)}</span>
          </div>
        </div>

        {/* Delivery & history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 12, fontSize: 15 }}>Доставка</h3>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 2 }}>
              <div>{order.ship_full_name}</div>
              <div>{order.ship_street}</div>
              <div>{order.ship_city}, {order.ship_country}</div>
              {order.ship_postal && <div>{order.ship_postal}</div>}
            </div>
          </div>

          {order.history?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 12, fontSize: 15 }}>Історія статусів</h3>
              {order.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span className={`status status-${h.status}`} style={{ fontSize: 10, padding: '2px 6px' }}>{statusLabel(h.status)}</span>
                  <span style={{ color: 'var(--muted)' }}>{new Date(h.at).toLocaleString('uk-UA')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
