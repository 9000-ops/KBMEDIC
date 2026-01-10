/**
 * Order Routes
 * Order management with transaction support
 */

const express = require('express');
const db = require('../database');
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get orders (admin sees all, customer sees own)
router.get('/', authenticate, async (req, res) => {
  try {
    let result;
    
    if (req.user.role === 'admin') {
      // Admin sees all orders with customer info
      result = await db.query(`
        SELECT o.*, u.name as customer_name, u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);
    } else {
      // Customer sees only their orders
      result = await db.query(`
        SELECT * FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [req.user.id]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Get order
    const orderResult = await db.query(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [req.params.id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check access (admin or owner)
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order items
    const itemsResult = await db.query(`
      SELECT * FROM order_items WHERE order_id = $1
    `, [req.params.id]);

    res.json({
      ...order,
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', optionalAuth, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const { items, customer_name, customer_phone, customer_address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Calculate total and validate products
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, name, price FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const product = productResult.rows[0];
      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price
      });
    }

    // If user is logged in, save their info
    let userId = null;
    let finalName = customer_name;
    let finalPhone = customer_phone;
    let finalAddress = customer_address;

    if (req.user) {
      userId = req.user.id;
      
      // If not provided in request, use user profile data
      if (!finalName || !finalPhone || !finalAddress) {
        const userResult = await client.query(
          'SELECT name, phone, address FROM users WHERE id = $1',
          [userId]
        );
        const user = userResult.rows[0];
        finalName = finalName || user.name;
        finalPhone = finalPhone || user.phone;
        finalAddress = finalAddress || user.address;
      }
    }

    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (user_id, total, status, customer_name, customer_phone, customer_address)
      VALUES ($1, $2, 'pending', $3, $4, $5)
      RETURNING id, created_at
    `, [userId, total, finalName, finalPhone, finalAddress]);

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const item of orderItems) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, item.product_id, item.product_name, item.quantity, item.price]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order_id: orderId,
      total,
      created_at: orderResult.rows[0].created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  } finally {
    client.release();
  }
});

// Update order status (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(`
      UPDATE orders
      SET status = COALESCE($1, status)
      WHERE id = $2
      RETURNING *
    `, [status, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get order statistics (admin only)
router.get('/stats/summary', authenticate, isAdmin, async (req, res) => {
  try {
    const totalOrders = await db.query('SELECT COUNT(*) as count FROM orders');
    const pendingOrders = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    const completedOrders = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'");
    const totalRevenue = await db.query("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status IN ('completed', 'shipped')");

    res.json({
      total_orders: parseInt(totalOrders.rows[0].count),
      pending_orders: parseInt(pendingOrders.rows[0].count),
      completed_orders: parseInt(completedOrders.rows[0].count),
      total_revenue: parseFloat(totalRevenue.rows[0].total)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
