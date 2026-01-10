// Vercel Serverless API Handler
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-store-secret-key-2024-secure';

// PostgreSQL client for serverless
let pgPool = null;

async function getPool() {
  if (pgPool) return pgPool;
  
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000
  });
  
  return pgPool;
}

async function query(text, params) {
  const pool = await getPool();
  return pool.query(text, params);
}

// Auth middleware
function authenticate(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(`
      INSERT INTO users (name, email, password, phone, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role
    `, [name, email.toLowerCase(), hashedPassword, phone, address]);

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const decoded = authenticate(req);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query(
      'SELECT id, name, email, phone, address, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ==================== PRODUCTS ROUTES ====================

app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let queryStr = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];
    
    if (category) {
      params.push(category);
      queryStr += ` AND p.category_id = $${params.length}`;
    }
    
    queryStr += ' ORDER BY p.created_at DESC';
    
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ==================== CATEGORIES ROUTES ====================

app.get('/api/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id ORDER BY c.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ==================== SETTINGS ROUTES ====================

app.get('/api/settings', async (req, res) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    
    if (result.rows.length === 0) {
      return res.json({ store_name: 'KB-Medic', delivery_fee: 300 });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ==================== ORDERS ROUTES ====================

app.get('/api/orders', async (req, res) => {
  try {
    const decoded = authenticate(req);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    let result;
    if (decoded.email === 'admin@pharmacy.com' || decoded.email === 'admin@kb-medic.com') {
      result = await query(`
        SELECT o.*, u.name as customer_name, u.email as customer_email
        FROM orders o LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);
    } else {
      result = await query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        [decoded.userId]
      );
    }

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, customer_name, customer_phone, customer_address } = req.body;
    const decoded = authenticate(req);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const productResult = await query('SELECT id, name, price FROM products WHERE id = $1', [item.product_id]);
      if (productResult.rows.length === 0) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }
      const product = productResult.rows[0];
      total += product.price * item.quantity;
      orderItems.push({ ...product, quantity: item.quantity });
    }

    const userId = decoded ? decoded.userId : null;
    const finalName = customer_name || (decoded ? decoded.email : 'Guest');

    const orderResult = await query(`
      INSERT INTO orders (user_id, total, status, customer_name, customer_phone, customer_address)
      VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id, created_at
    `, [userId, total, finalName, customer_phone, customer_address]);

    const orderId = orderResult.rows[0].id;

    for (const item of orderItems) {
      await query(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, item.id, item.name, item.quantity, item.price]);
    }

    res.status(201).json({
      message: 'Order created successfully',
      order_id: orderId,
      total,
      created_at: orderResult.rows[0].created_at
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Export for Vercel
module.exports = app;
