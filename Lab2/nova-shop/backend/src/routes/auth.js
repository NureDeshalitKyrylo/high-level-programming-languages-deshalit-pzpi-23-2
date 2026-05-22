import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET  = process.env.JWT_SECRET  || 'supersecret_dev_key_change_in_prod';
const JWT_REFRESH = process.env.JWT_REFRESH || 'refresh_secret_change_in_prod';
const ACCESS_EXP  = '15m';
const REFRESH_EXP = '7d';

function signAccess(user)  { return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET,  { expiresIn: ACCESS_EXP  }); }
function signRefresh(user) { return jwt.sign({ id: user.id }, JWT_REFRESH, { expiresIn: REFRESH_EXP }); }

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6)  return res.status(400).json({ error: 'Password min 6 chars' });

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      'INSERT INTO users(email, password_hash, full_name) VALUES($1,$2,$3) RETURNING id,email,full_name,role',
      [email.toLowerCase(), hash, full_name || null]
    );
    const user = rows[0];

    // create empty cart
    await query('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT DO NOTHING', [user.id]);

    const accessToken  = signAccess(user);
    const refreshToken = signRefresh(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES($1,$2,$3)',
      [user.id, refreshToken, expiresAt]);

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

    const accessToken  = signAccess(user);
    const refreshToken = signRefresh(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES($1,$2,$3)',
      [user.id, refreshToken, expiresAt]);

    // ensure cart exists
    await query('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT DO NOTHING', [user.id]);

    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
               accessToken, refreshToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Token required' });

    const payload = jwt.verify(refreshToken, JWT_REFRESH);
    const { rows } = await query(
      'SELECT * FROM refresh_tokens WHERE token=$1 AND user_id=$2 AND expires_at > NOW()',
      [refreshToken, payload.id]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const userRes = await query('SELECT id,email,full_name,role FROM users WHERE id=$1', [payload.id]);
    const user = userRes.rows[0];

    // rotate token
    await query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
    const newRefresh = signRefresh(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES($1,$2,$3)',
      [user.id, newRefresh, expiresAt]);

    res.json({ accessToken: signAccess(user), refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    'SELECT id,email,full_name,avatar_url,role,created_at FROM users WHERE id=$1', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

export default router;
