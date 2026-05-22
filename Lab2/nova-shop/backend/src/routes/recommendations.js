import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/recommendations  — tag-based for authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const { rows } = await query(`
      SELECT product_id AS id, name, slug, price, image_urls,
             relevance_score
      FROM v_user_recommendations
      WHERE user_id = $1
      ORDER BY relevance_score DESC
      LIMIT $2
    `, [req.user.id, Number(limit)]);

    // fallback: popular products if no affinity yet
    if (!rows.length) {
      const fallback = await query(`
        SELECT p.id, p.name, p.slug, p.price, p.image_urls
        FROM products p
        WHERE p.is_active = TRUE AND p.stock_qty > 0
        ORDER BY p.is_featured DESC, p.created_at DESC
        LIMIT $1
      `, [Number(limit)]);
      return res.json(fallback.rows);
    }
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
