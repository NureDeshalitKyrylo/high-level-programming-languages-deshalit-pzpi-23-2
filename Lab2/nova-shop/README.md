# NOVA Shop — Full-Stack E-Commerce Platform

A production-ready e-commerce platform built with Node.js + Express (backend) and React (frontend), powered by PostgreSQL.

## Features

- 🛍️ Product catalog with search, filters, tags, pagination
- 🛒 Shopping cart with real-time updates
- 📦 Order management & checkout
- 👤 User auth (JWT access + refresh token rotation)
- 📊 Order status tracking with visual progress bar
- 🤖 Tag-based personalized recommendations
- 🔐 Admin panel for order management
- ⚡ Optimized: compression, rate limiting, code splitting, lazy images

---

## Project Structure

```
/
├── db/
│   └── schema.sql          ← Full PostgreSQL schema + seed data
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js         ← Express app entry
│       ├── config/db.js     ← PostgreSQL pool
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── products.js
│           ├── cart.js
│           ├── orders.js
│           ├── categories.js
│           └── recommendations.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx          ← All pages & components
        ├── index.css        ← Design system
        ├── api/client.js    ← Axios + auto token refresh
        └── store/index.js   ← Zustand (auth + cart)
```

---

## Quick Start

### 1. PostgreSQL — Create Database & Schema

```bash
psql -U postgres
```
```sql
CREATE DATABASE shopdb;
\c shopdb
\i db/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, JWT_REFRESH

npm install
npm run dev
# API runs on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## Environment Variables (backend/.env)

| Variable       | Default                  | Description                    |
|----------------|--------------------------|--------------------------------|
| `PORT`         | `4000`                   | API port                       |
| `FRONTEND_URL` | `http://localhost:5173`  | CORS allowed origin            |
| `DB_HOST`      | `localhost`              | PostgreSQL host                |
| `DB_PORT`      | `5432`                   | PostgreSQL port                |
| `DB_NAME`      | `shopdb`                 | Database name                  |
| `DB_USER`      | `postgres`               | Database user                  |
| `DB_PASSWORD`  | *(required)*             | Database password              |
| `JWT_SECRET`   | *(required)*             | Access token secret (≥32 chars)|
| `JWT_REFRESH`  | *(required)*             | Refresh token secret (≥32 chars)|

---

## API Endpoints

### Auth
| Method | Path                  | Auth     | Description           |
|--------|-----------------------|----------|-----------------------|
| POST   | `/api/auth/register`  | —        | Register user         |
| POST   | `/api/auth/login`     | —        | Login → tokens        |
| POST   | `/api/auth/refresh`   | —        | Rotate refresh token  |
| POST   | `/api/auth/logout`    | Bearer   | Revoke refresh token  |
| GET    | `/api/auth/me`        | Bearer   | Current user          |

### Products
| Method | Path                    | Auth     | Description              |
|--------|-------------------------|----------|--------------------------|
| GET    | `/api/products`         | Optional | List (search, filter, sort, page) |
| GET    | `/api/products/:slug`   | Optional | Single product + tags    |
| POST   | `/api/products`         | Admin    | Create product           |

**Query params for GET /api/products:**
`search`, `category`, `tag`, `min_price`, `max_price`, `featured`, `sort` (price/name/created_at), `order` (asc/desc), `page`, `limit`

### Cart
| Method | Path                    | Auth   | Description         |
|--------|-------------------------|--------|---------------------|
| GET    | `/api/cart`             | Bearer | Get cart items      |
| POST   | `/api/cart/items`       | Bearer | Add item            |
| PATCH  | `/api/cart/items/:id`   | Bearer | Update quantity     |
| DELETE | `/api/cart/items/:id`   | Bearer | Remove item         |
| DELETE | `/api/cart`             | Bearer | Clear cart          |

### Orders
| Method | Path                      | Auth   | Description              |
|--------|---------------------------|--------|--------------------------|
| POST   | `/api/orders`             | Bearer | Checkout (creates order) |
| GET    | `/api/orders`             | Bearer | User's orders            |
| GET    | `/api/orders/:id`         | Bearer | Order detail + history   |
| PATCH  | `/api/orders/:id/status`  | Admin  | Update status            |
| GET    | `/api/orders/admin/all`   | Admin  | All orders (admin)       |

### Recommendations
| Method | Path                  | Auth   | Description                          |
|--------|-----------------------|--------|--------------------------------------|
| GET    | `/api/recommendations`| Bearer | Tag-affinity based recommendations   |

---

## Recommendation System

The system uses **tag-based affinity scoring**:

1. Every product has multiple `tags` (e.g. `wireless`, `premium`, `gaming`)
2. When a user **views** a product → +1 score per tag (`user_tag_affinity`)
3. When a user **purchases** a product → +10 score per tag
4. Recommendations = products whose tags match the user's highest-affinity tags, **excluding already purchased products**
5. Results sorted by `relevance_score DESC`
6. Falls back to featured/new products for new users with no history

### Key DB objects:
- `tags` — tag definitions
- `product_tags` — product↔tag many-to-many
- `user_tag_affinity` — per-user accumulated score per tag
- `product_events` — raw view/purchase event log
- `v_user_recommendations` — materialized view joining all above
- `update_tag_affinity_on_purchase(user_id, product_id)` — PL/pgSQL function
- `update_tag_affinity_on_view(user_id, product_id)` — PL/pgSQL function

---

## Authentication Flow

```
Login → accessToken (15min JWT) + refreshToken (7d, stored in DB)
         ↓
Request with Bearer accessToken
         ↓ 401?
Axios interceptor → POST /auth/refresh → new tokens (rotation)
         ↓ refresh also fails?
Redirect to /login, clear localStorage
```

---

## Order Status Flow

```
pending → confirmed → processing → shipped → delivered
                                         ↘ cancelled
                                         ↘ refunded
```

All status changes are logged in `order_status_history` via a PostgreSQL trigger.

---

## Performance Optimizations

| Technique           | Where                                  |
|---------------------|----------------------------------------|
| `compression`       | Express gzip middleware                |
| `helmet`            | Security headers                       |
| Rate limiting       | 20 req/15min on auth, 120 req/min API  |
| Vite code splitting | vendor + store chunks separate         |
| DB indexes          | All FK columns, text search (pg_trgm)  |
| Connection pooling  | pg Pool (max 20 connections)           |
| Token rotation      | Short-lived access tokens (15 min)     |
| Lazy img loading    | Native browser lazy load              |

---

## Seed Data

The schema includes seed data:
- **1 admin user**: `admin@shop.com` / `Admin123!`
- **5 root categories** + 5 subcategories
- **15 tags** (wireless, bluetooth, gaming, eco-friendly, etc.)
- **13 products** with full tag assignments
