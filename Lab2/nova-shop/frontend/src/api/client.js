import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// attach access token
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('accessToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// auto-refresh on 401
let refreshing = null;
api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      if (!refreshing) {
        refreshing = axios.post('/api/auth/refresh', {
          refreshToken: localStorage.getItem('refreshToken')
        }).then(r => {
          localStorage.setItem('accessToken',  r.data.accessToken);
          localStorage.setItem('refreshToken', r.data.refreshToken);
          refreshing = null;
        }).catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          refreshing = null;
        });
      }
      await refreshing;
      orig.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
      return api(orig);
    }
    return Promise.reject(err);
  }
);

export default api;
