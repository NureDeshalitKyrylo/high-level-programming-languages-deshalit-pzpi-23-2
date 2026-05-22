import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes           from './routes/auth.js';
import productRoutes        from './routes/products.js';
import cartRoutes           from './routes/cart.js';
import orderRoutes          from './routes/orders.js';
import categoryRoutes       from './routes/categories.js';
import recommendationRoutes from './routes/recommendations.js';

const app  = express();
const PORT = process.env.PORT || 4000;

// Security & perf middleware
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } }));
app.use('/api',      rateLimit({ windowMs:  1 * 60 * 1000, max: 120 }));

// Routes
app.use('/api/auth',            authRoutes);
app.use('/api/products',        productRoutes);
app.use('/api/cart',            cartRoutes);
app.use('/api/orders',          orderRoutes);
app.use('/api/categories',      categoryRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`✅  API running on http://localhost:${PORT}`));
export default app;
