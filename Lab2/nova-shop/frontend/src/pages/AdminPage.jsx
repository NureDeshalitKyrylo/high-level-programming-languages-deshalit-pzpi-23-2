import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../store/index.js';
import statusLabel from '../components/statusLabel.js';
import { toast } from '../components/Toast.jsx';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const url = `/orders/admin/all${filter ? `?status=${filter}` : ''}`;
    api.get(url).then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
      toast('Статус оновлено');
    } catch { toast('Помилка', 'error'); }
  };

  if (!user || user.role !== 'admin') return <Navigate to="/" />;

  const STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled'];

  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Панель адміна</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${filter === '' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('')}>Всі</button>
        {STATUSES.map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['ID', 'Клієнт', 'Сума', 'Статус', 'Дата', 'Дії'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{o.id.slice(0, 8)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div>{o.user_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.user_email}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--accent)' }}>${Number(o.total_amount).toFixed(2)}</td>
                  <td style={{ padding: '10px 12px' }}><span className={`status status-${o.status}`}>{statusLabel(o.status)}</span></td>
                  <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{new Date(o.created_at).toLocaleString('uk-UA')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <select value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}
                      style={{ width: 140, padding: '5px 8px', fontSize: 12 }}>
                      {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Немає замовлень</p>}
        </div>
      )}
    </div>
  );
}
