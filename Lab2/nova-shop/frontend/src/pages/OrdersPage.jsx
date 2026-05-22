import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import statusLabel from '../components/statusLabel.js';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, marginBottom: 32 }}>Мої замовлення</h1>
      {orders.length === 0 && <p style={{ color: 'var(--muted)' }}>У вас ще немає замовлень</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {orders.map(o => (
          <div key={o.id} className="card" style={{ padding: 20, cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 4 }}>
                  Замовлення #{o.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(o.created_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`status status-${o.status}`}>{statusLabel(o.status)}</span>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 6 }}>
                  ${Number(o.total_amount).toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {o.items?.slice(0, 4).map((item, i) => (
                <span key={i} style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', padding: '3px 8px', borderRadius: 6 }}>
                  {item.product_name}
                </span>
              ))}
              {o.items?.length > 4 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>+{o.items.length - 4} more</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
