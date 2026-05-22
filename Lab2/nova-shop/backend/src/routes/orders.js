import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/orders  — checkout
router.post('/', authenticate, async (req, res) => {
  try {
    const { shipping_address, payment_method = 'card', notes } = req.body;
    if (!shipping_address) return res.status(400).json({ error: 'Shipping address required' });

    // fetch cart
    const cartItems = await query(`
      SELECT ci.*, p.name AS product_name, p.sku, p.stock_qty
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = $1
    `, [req.user.id]);

    if (!cartItems.rows.length) return res.status(400).json({ error: 'Cart is empty' });

    // validate stock
    for (const item of cartItems.rows) {
      if (item.stock_qty < item.quantity)
        return res.status(400).json({ error: `Insufficient stock: ${item.product_name}` });
    }

    const shipping = shipping_address;
    const subtotal = cartItems.rows.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
    const shippingCost = subtotal > 100 ? 0 : 9.99;
    const total = subtotal + shippingCost;

    // create order
    const orderRes = await query(`
      INSERT INTO orders(user_id, total_amount, shipping_amount, ship_country, ship_city,
        ship_street, ship_postal, ship_full_name, ship_phone, payment_method, payment_status, notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'paid',$11)
      RETURNING *
    `, [req.user.id, total, shippingCost, shipping.country, shipping.city,
        shipping.street, shipping.postal || null, shipping.full_name, shipping.phone || null,
        payment_method, notes || null]);

    const order = orderRes.rows[0];

    // insert order items + update stock
    for (const item of cartItems.rows) {
      await query(`
        INSERT INTO order_items(order_id, product_id, product_name, sku, quantity, unit_price)
        VALUES($1,$2,$3,$4,$5,$6)
      `, [order.id, item.product_id, item.product_name, item.sku, item.quantity, item.unit_price]);

      await query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id=$2', [item.quantity, item.product_id]);

      // update tag affinity
      query('SELECT update_tag_affinity_on_purchase($1,$2)', [req.user.id, item.product_id]).catch(() => {});
    }

    // clear cart
    await query('DELETE FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=$1)', [req.user.id]);

    res.status(201).json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders  — user's orders
router.get('/', authenticate, async (req, res) => {
  const { rows } = await query(`
    SELECT o.*,
           COALESCE(json_agg(json_build_object(
             'id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
             'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price
           )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [req.user.id]);
  res.json(rows);
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await query(`
    SELECT o.*,
           COALESCE(json_agg(json_build_object(
             'id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
             'sku', oi.sku, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price
           )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items,
           (SELECT json_agg(json_build_object('status', h.new_status, 'at', h.created_at, 'comment', h.comment)
             ORDER BY h.created_at)
            FROM order_status_history h WHERE h.order_id = o.id) AS history
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = $1 AND (o.user_id = $2 OR $3 = 'admin')
    GROUP BY o.id
  `, [req.params.id, req.user.id, req.user.role]);

  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// PATCH /api/orders/:id/status  (admin)
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { status, comment } = req.body;
  const valid = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { rows } = await query(
    'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  if (comment) {
    await query('INSERT INTO order_status_history(order_id,new_status,changed_by,comment) VALUES($1,$2,$3,$4)',
      [req.params.id, status, req.user.id, comment]);
  }
  res.json(rows[0]);
});

// GET /api/orders/admin/all  (admin)
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  const cond = status ? `WHERE o.status = '${status}'` : '';
  const { rows } = await query(`
    SELECT o.*, u.email AS user_email, u.full_name AS user_name
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ${cond}
    ORDER BY o.created_at DESC
    LIMIT $1 OFFSET $2
  `, [Number(limit), offset]);
  res.json(rows);
});

export default router;
