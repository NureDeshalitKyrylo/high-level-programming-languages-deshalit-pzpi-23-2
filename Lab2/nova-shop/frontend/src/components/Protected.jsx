import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/index.js';

export default function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  return user ? children : <Navigate to="/login" />;
}
