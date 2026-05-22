import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/index.js';
import { toast } from '../components/Toast.jsx';

export default function AuthPage({ mode }) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const navigate = useNavigate();

  const handle = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else                  await register(email, password, name);
      navigate('/');
      toast('Ласкаво просимо! 👋');
    } catch (e) {
      toast(e.response?.data?.error || 'Помилка', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, height: 400 }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 36 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          {mode === 'login' ? 'Увійти' : 'Реєстрація'}
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>
          {mode === 'login' ? 'Немає акаунту? ' : 'Вже є акаунт? '}
          <Link to={mode === 'login' ? '/register' : '/login'} style={{ color: 'var(--accent2)' }}>
            {mode === 'login' ? 'Зареєструватись' : 'Увійти'}
          </Link>
        </p>

        <form onSubmit={handle}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Ім'я</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше ім'я" />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 13 }} disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Увійти' : 'Створити акаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}
