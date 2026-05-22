-- ============================================================
-- PostgreSQL Schema for E-Commerce Platform
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name   VARCHAR(255),
    avatar_url  TEXT,
    role        VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(100),               -- 'Home', 'Work', etc.
    country     VARCHAR(100) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    street      TEXT NOT NULL,
    postal_code VARCHAR(20),
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATALOG
-- ============================================================

CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    parent_id   INT REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url   TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id     INT REFERENCES categories(id) ON DELETE SET NULL,
    sku             VARCHAR(100) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    description     TEXT,
    price           NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    compare_price   NUMERIC(12, 2),          -- original price before discount
    stock_qty       INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    weight_kg       NUMERIC(8, 3),
    image_urls      TEXT[] NOT NULL DEFAULT '{}',
    meta_title      VARCHAR(255),
    meta_description TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Many-to-many: products <-> tags
CREATE TABLE product_tags (
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id      INT  NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- ============================================================
-- CART
-- ============================================================

CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    session_id  VARCHAR(255),               -- for anonymous carts
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  NUMERIC(12, 2) NOT NULL,    -- price at time of adding
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
    total_amount    NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    -- snapshot of shipping address
    ship_country    VARCHAR(100),
    ship_city       VARCHAR(100),
    ship_street     TEXT,
    ship_postal     VARCHAR(20),
    ship_full_name  VARCHAR(255),
    ship_phone      VARCHAR(50),
    payment_method  VARCHAR(50),
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','paid','refunded')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,     -- snapshot
    sku          VARCHAR(100),
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE order_status_history (
    id          SERIAL PRIMARY KEY,
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status  VARCHAR(30),
    new_status  VARCHAR(30) NOT NULL,
    changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECOMMENDATIONS (tag-based)
-- ============================================================

-- Track which tags a user has interacted with (view / purchase)
CREATE TABLE user_tag_affinity (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id      INT  NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    score       NUMERIC(10, 4) NOT NULL DEFAULT 0, -- higher = stronger affinity
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tag_id)
);

-- View / click events for implicit feedback
CREATE TABLE product_events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id  VARCHAR(255),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    event_type  VARCHAR(30) NOT NULL CHECK (event_type IN ('view','click','add_to_cart','purchase','wishlist')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE product_reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(255),
    body        TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_active      ON products(is_active);
CREATE INDEX idx_products_featured    ON products(is_featured);
CREATE INDEX idx_products_price       ON products(price);
CREATE INDEX idx_products_name_trgm   ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_product_tags_tag     ON product_tags(tag_id);
CREATE INDEX idx_cart_items_cart      ON cart_items(cart_id);
CREATE INDEX idx_order_items_order    ON order_items(order_id);
CREATE INDEX idx_orders_user          ON orders(user_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_events_user          ON product_events(user_id);
CREATE INDEX idx_events_product       ON product_events(product_id);
CREATE INDEX idx_affinity_user        ON user_tag_affinity(user_id);
CREATE INDEX idx_refresh_tokens_user  ON refresh_tokens(user_id);
CREATE INDEX idx_status_history_order ON order_status_history(order_id);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_upd       BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_upd    BEFORE UPDATE ON products      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_carts_upd       BEFORE UPDATE ON carts         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_upd      BEFORE UPDATE ON orders        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: auto-record order status changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_order_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history(order_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_log
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_status();

-- ============================================================
-- FUNCTION: update tag affinity after purchase
-- ============================================================

CREATE OR REPLACE FUNCTION update_tag_affinity_on_purchase(p_user_id UUID, p_product_id UUID)
RETURNS VOID AS $$
DECLARE
    v_tag_id INT;
BEGIN
    FOR v_tag_id IN
        SELECT tag_id FROM product_tags WHERE product_id = p_product_id
    LOOP
        INSERT INTO user_tag_affinity(user_id, tag_id, score)
        VALUES (p_user_id, v_tag_id, 10)
        ON CONFLICT (user_id, tag_id) DO UPDATE
            SET score      = user_tag_affinity.score + 10,
                updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: update tag affinity on view (lighter weight)
-- ============================================================

CREATE OR REPLACE FUNCTION update_tag_affinity_on_view(p_user_id UUID, p_product_id UUID)
RETURNS VOID AS $$
DECLARE
    v_tag_id INT;
BEGIN
    FOR v_tag_id IN
        SELECT tag_id FROM product_tags WHERE product_id = p_product_id
    LOOP
        INSERT INTO user_tag_affinity(user_id, tag_id, score)
        VALUES (p_user_id, v_tag_id, 1)
        ON CONFLICT (user_id, tag_id) DO UPDATE
            SET score      = user_tag_affinity.score + 1,
                updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEW: recommended products for a user
-- Returns products whose tags match the user's highest-affinity tags,
-- excluding products the user already purchased.
-- ============================================================

CREATE OR REPLACE VIEW v_user_recommendations AS
SELECT DISTINCT ON (uta.user_id, p.id)
    uta.user_id,
    p.id            AS product_id,
    p.name,
    p.slug,
    p.price,
    p.image_urls,
    SUM(uta.score)  OVER (PARTITION BY uta.user_id, p.id) AS relevance_score
FROM user_tag_affinity  uta
JOIN product_tags        pt  ON pt.tag_id     = uta.tag_id
JOIN products            p   ON p.id          = pt.product_id
                             AND p.is_active   = TRUE
                             AND p.stock_qty   > 0
WHERE p.id NOT IN (
    SELECT oi.product_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = uta.user_id
      AND o.status NOT IN ('cancelled','refunded')
)
ORDER BY uta.user_id, p.id;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: Admin123!)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@shop.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iFCG', 'Admin User', 'admin');

-- Categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Electronics',    'electronics',    'Gadgets and devices',           1),
('Clothing',       'clothing',       'Fashion and apparel',           2),
('Books',          'books',          'Literature and learning',        3),
('Home & Garden',  'home-garden',    'For your home',                 4),
('Sports',         'sports',         'Sports and outdoor activities',  5);

INSERT INTO categories (parent_id, name, slug, sort_order) VALUES
(1, 'Smartphones',  'smartphones',  1),
(1, 'Laptops',      'laptops',      2),
(1, 'Audio',        'audio',        3),
(2, 'Men',          'men',          1),
(2, 'Women',        'women',        2);

-- Tags
INSERT INTO tags (name, slug) VALUES
('wireless',      'wireless'),
('bluetooth',     'bluetooth'),
('premium',       'premium'),
('sale',          'sale'),
('new',           'new'),
('eco-friendly',  'eco-friendly'),
('bestseller',    'bestseller'),
('portable',      'portable'),
('smart',         'smart'),
('gaming',        'gaming'),
('vintage',       'vintage'),
('minimalist',    'minimalist'),
('waterproof',    'waterproof'),
('fast-charging', 'fast-charging'),
('noise-cancel',  'noise-cancel');

-- Products
INSERT INTO products (category_id, sku, name, slug, description, price, compare_price, stock_qty, is_featured, image_urls) VALUES
(6,  'PHN-001', 'ProMax X15 Smartphone',     'promax-x15',        'Flagship smartphone with 6.7" AMOLED display, 200MP camera.',   999.00, 1199.00, 50,  TRUE,  ARRAY['https://picsum.photos/seed/phone1/600/600','https://picsum.photos/seed/phone1b/600/600']),
(6,  'PHN-002', 'Pixel Ultra 8',             'pixel-ultra-8',     'AI-powered camera phone with pure Android experience.',          749.00,  NULL,   80,  FALSE, ARRAY['https://picsum.photos/seed/phone2/600/600']),
(7,  'LAP-001', 'UltraBook Pro 14',          'ultrabook-pro-14',  'Ultra-thin laptop with M3 chip, 16GB RAM, 512GB SSD.',          1499.00, 1799.00, 30,  TRUE,  ARRAY['https://picsum.photos/seed/laptop1/600/600']),
(7,  'LAP-002', 'GameForce RTX Laptop',      'gameforce-rtx',     'Gaming laptop with RTX 4070, 144Hz display, 32GB RAM.',         1899.00,  NULL,   20,  FALSE, ARRAY['https://picsum.photos/seed/laptop2/600/600']),
(8,  'AUD-001', 'SoundWave Pro Headphones',  'soundwave-pro',     'Active noise-cancelling over-ear headphones, 40h battery.',      349.00,  399.00, 120, TRUE,  ARRAY['https://picsum.photos/seed/head1/600/600']),
(8,  'AUD-002', 'BassBoost Earbuds',         'bassboost-earbuds', 'True wireless earbuds with deep bass and IPX5 rating.',           89.00,   NULL,  200, FALSE, ARRAY['https://picsum.photos/seed/ear1/600/600']),
(8,  'AUD-003', 'Studio Monitor Speakers',   'studio-monitors',   'Professional 2.1 studio monitor system for audiophiles.',        599.00,  NULL,   25,  FALSE, ARRAY['https://picsum.photos/seed/speaker1/600/600']),
(9,  'CLM-001', 'Classic Oxford Shirt',      'oxford-shirt',      '100% Egyptian cotton button-down in multiple colors.',            79.00,   99.00, 150, FALSE, ARRAY['https://picsum.photos/seed/shirt1/600/600']),
(10, 'CLW-001', 'Linen Summer Dress',        'linen-dress',       'Breathable linen midi dress, perfect for warm weather.',          129.00,  NULL,  100, TRUE,  ARRAY['https://picsum.photos/seed/dress1/600/600']),
(3,  'BKS-001', 'Clean Code (R. Martin)',    'clean-code',        'A handbook of agile software craftsmanship.',                     45.00,   NULL,  500, FALSE, ARRAY['https://picsum.photos/seed/book1/600/600']),
(3,  'BKS-002', 'Atomic Habits',             'atomic-habits',     'An easy & proven way to build good habits & break bad ones.',     32.00,   NULL,  400, TRUE,  ARRAY['https://picsum.photos/seed/book2/600/600']),
(4,  'HMG-001', 'Smart Garden Planter',      'smart-planter',     'Self-watering smart planter with soil sensor and app control.',   89.00,   NULL,   60, FALSE, ARRAY['https://picsum.photos/seed/plant1/600/600']),
(5,  'SPT-001', 'TrailBlazer Running Shoes', 'trailblazer-shoes', 'Lightweight trail running shoes with carbon plate.',             179.00,  220.00,  90, TRUE,  ARRAY['https://picsum.photos/seed/shoe1/600/600']);

-- Product-Tag assignments
INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id FROM products p, tags t WHERE
    (p.slug = 'promax-x15'       AND t.slug IN ('premium','new','fast-charging','smart')) OR
    (p.slug = 'pixel-ultra-8'    AND t.slug IN ('new','smart')) OR
    (p.slug = 'ultrabook-pro-14' AND t.slug IN ('premium','minimalist','new')) OR
    (p.slug = 'gameforce-rtx'    AND t.slug IN ('gaming','new')) OR
    (p.slug = 'soundwave-pro'    AND t.slug IN ('wireless','bluetooth','noise-cancel','premium','bestseller')) OR
    (p.slug = 'bassboost-earbuds'AND t.slug IN ('wireless','bluetooth','portable','waterproof')) OR
    (p.slug = 'studio-monitors'  AND t.slug IN ('premium','bluetooth')) OR
    (p.slug = 'oxford-shirt'     AND t.slug IN ('minimalist','bestseller')) OR
    (p.slug = 'linen-dress'      AND t.slug IN ('eco-friendly','new')) OR
    (p.slug = 'clean-code'       AND t.slug IN ('bestseller')) OR
    (p.slug = 'atomic-habits'    AND t.slug IN ('bestseller','new')) OR
    (p.slug = 'smart-planter'    AND t.slug IN ('smart','eco-friendly','wireless')) OR
    (p.slug = 'trailblazer-shoes'AND t.slug IN ('sale','waterproof','portable'));
