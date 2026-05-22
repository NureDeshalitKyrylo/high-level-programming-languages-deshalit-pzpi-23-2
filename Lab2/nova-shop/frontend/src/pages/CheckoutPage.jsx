import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/index.js';
import { useAuth } from '../store/index.js';
import api from '../api/client.js';
import { toast } from '../components/Toast.jsx';

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const total = useCart(s => s.total());
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ full_name: user?.full_name || '', country: 'Україна', city: '', street: '', postal: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const validatePhone = phone => {
    const normalized = String(phone).trim();
    return /^\+?[0-9\s()-]{7,20}$/.test(normalized);
  };

  const validatePostal = postal => {
    if (!postal) return true;
    return /^\d{5}$/.test(String(postal).trim());
  };

  if (!items.length) return (
    <div className="page" style={{ padding: 80, textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: 16 }}>Кошик порожній</h2>
      <button className="btn btn-primary" onClick={() => navigate('/products')}>До каталогу</button>
    </div>
  );

  const shipping = total > 100 ? 0 : 9.99;

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validatePhone(form.phone)) {
      toast('Введіть коректний номер телефону', 'error');
      return;
    }

    if (!validatePostal(form.postal)) {
      toast('Введіть поштовий індекс у форматі 5 цифр', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        shipping_address: form,
        payment_method: 'card',
      });
      await clearCart();
      toast('Замовлення оформлено! 🎉');
      navigate(`/orders/${data.id}`);
    } catch (e) {
      toast(e.response?.data?.error || 'Помилка', 'error');
    } finally {
      setLoading(false);
    }
  };

  const F = ({ label, name, ...rest }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} {...rest} />
    </div>
  );

  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, marginBottom: 32 }}>Оформлення замовлення</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, flexWrap: 'wrap' }}>
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 20 }}>Адреса доставки</h3>
            <F label="Ім'я та прізвище" name="full_name" required />
            <F label="Телефон" name="phone" type="tel" pattern="^\+?[0-9\s()-]{7,20}$" title="Наприклад +380501234567" required />
            <F label="Країна" name="country" required />
            <F label="Місто" name="city" required />
            <F label="Вулиця, будинок" name="street" required />
            <F label="Поштовий індекс" name="postal" pattern="^\d{5}$" title="5 цифр" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: 16, padding: 14 }} disabled={loading}>
            {loading ? 'Оформлюємо…' : `Підтвердити замовлення — $${(total + shipping).toFixed(2)}`}
          </button>
        </form>

        {/* Summary */}
        <div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-head)', marginBottom: 16 }}>Ваше замовлення</h3>
            {items.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>{i.name} × {i.quantity}</span>
                <span>${(Number(i.unit_price) * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span style={{ color: 'var(--muted)' }}>Доставка:</span>
                <span>{shipping === 0 ? 'Безкоштовно' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>
                <span>Разом:</span>
                <span style={{ color: 'var(--accent)' }}>${(total + shipping).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
