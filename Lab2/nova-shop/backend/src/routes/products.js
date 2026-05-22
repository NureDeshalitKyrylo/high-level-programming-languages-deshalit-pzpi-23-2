import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/products  — list with filters, search, pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search, category, tag, min_price, max_price,
      featured, sort = 'created_at', order = 'desc',
      page = 1, limit = 12
    } = req.query;

    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let i = 1;

    if (search) {
      conditions.push(`p.name ILIKE $${i++}`);
      params.push(`%${search}%`);
    }
    if (category) {
      conditions.push(`c.slug = $${i++}`);
      params.push(category);
    }
    if (tag) {
      conditions.push(`EXISTS(SELECT 1 FROM product_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.product_id=p.id AND t.slug=$${i++})`);
      params.push(tag);
    }
    if (min_price) { conditions.push(`p.price >= $${i++}`); params.push(Number(min_price)); }
    if (max_price) { conditions.push(`p.price <= $${i++}`); params.push(Number(max_price)); }
    if (featured === 'true') { conditions.push('p.is_featured = TRUE'); }

    const allowedSort  = { price: 'p.price', name: 'p.name', created_at: 'p.created_at' };
    const sortCol      = allowedSort[sort] || 'p.created_at';
    const sortDir      = order === 'asc' ? 'ASC' : 'DESC';
    const offset       = (Number(page) - 1) * Number(limit);

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
             COALESCE(json_agg(DISTINCT t.slug) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_tags pt ON pt.product_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      ${where}
      GROUP BY p.id, c.name, c.slug
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${i++} OFFSET $${i++}
    `;
    params.push(Number(limit), offset);

    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
    `;

    const [data, count] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2)),
    ]);

    res.json({
      items: data.rows,
      total: Number(count.rows[0].total),
      page:  Number(page),
      limit: Number(limit),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
             COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
                      FILTER (WHERE t.id IS NOT NULL), '[]') AS tags,
             ROUND(AVG(pr.rating),1) AS avg_rating,
             COUNT(pr.id) AS review_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_tags pt ON pt.product_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      LEFT JOIN product_reviews pr ON pr.product_id = p.id AND pr.is_approved = TRUE
      WHERE p.slug = $1
      GROUP BY p.id, c.name, c.slug
    `, [req.params.slug]);

    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // record view event
    if (req.user) {
      query('INSERT INTO product_events(user_id, product_id, event_type) VALUES($1,$2,$3)',
        [req.user.id, rows[0].id, 'view']).catch(() => {});
      query('SELECT update_tag_affinity_on_view($1,$2)', [req.user.id, rows[0].id]).catch(() => {});
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products  (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category_id, sku, name, slug, description, price, compare_price, stock_qty, is_featured, image_urls, tags } = req.body;
    const { rows } = await query(`
      INSERT INTO products(category_id,sku,name,slug,description,price,compare_price,stock_qty,is_featured,image_urls)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [category_id, sku, name, slug, description, price, compare_price || null, stock_qty || 0, is_featured || false, image_urls || []]);
    const product = rows[0];

    if (tags?.length) {
      for (const slug of tags) {
        const t = await query('SELECT id FROM tags WHERE slug=$1', [slug]);
        if (t.rows.length) await query('INSERT INTO product_tags VALUES($1,$2) ON CONFLICT DO NOTHING', [product.id, t.rows[0].id]);
      }
    }
    res.status(201).json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
