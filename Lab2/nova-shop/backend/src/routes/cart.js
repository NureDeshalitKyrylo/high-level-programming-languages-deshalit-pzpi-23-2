import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

async function getCart(userId) {
  const { rows } = await query(`
    SELECT ci.id, ci.product_id, ci.quantity, ci.unit_price,
           p.name, p.slug, p.stock_qty, p.image_urls, p.price AS current_price
    FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    WHERE c.user_id = $1
    ORDER BY ci.created_at
  `, [userId]);
  return rows;
}

// GET /api/cart
router.get('/', authenticate, async (req, res) => {
  res.json(await getCart(req.user.id));
});

// POST /api/cart/items
router.post('/items', authenticate, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const prod = await query('SELECT * FROM products WHERE id=$1 AND is_active=TRUE', [product_id]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Product not found' });
    const product = prod.rows[0];
    if (product.stock_qty < quantity) return res.status(400).json({ error: 'Not enough stock' });

    // ensure cart
    await query('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING', [req.user.id]);
    const cart = await query('SELECT id FROM carts WHERE user_id=$1', [req.user.id]);
    const cartId = cart.rows[0].id;

    await query(`
      INSERT INTO cart_items(cart_id, product_id, quantity, unit_price)
      VALUES($1,$2,$3,$4)
      ON CONFLICT (cart_id, product_id) DO UPDATE
        SET quantity = cart_items.quantity + EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price
    `, [cartId, product_id, quantity, product.price]);

    res.json(await getCart(req.user.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/cart/items/:id
router.patch('/items/:id', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      await query('DELETE FROM cart_items WHERE id=$1', [req.params.id]);
    } else {
      await query('UPDATE cart_items SET quantity=$1 WHERE id=$2', [quantity, req.params.id]);
    }
    res.json(await getCart(req.user.id));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/cart/items/:id
router.delete('/items/:id', authenticate, async (req, res) => {
  await query('DELETE FROM cart_items WHERE id=$1', [req.params.id]);
  res.json(await getCart(req.user.id));
});

// DELETE /api/cart  — clear cart
router.delete('/', authenticate, async (req, res) => {
  await query('DELETE FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=$1)', [req.user.id]);
  res.json([]);
});

export default router;
