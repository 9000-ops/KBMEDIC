// Vercel Serverless API Handler
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// إعدادات أمان أساسية
app.disable('x-powered-by');
app.set('etag', false); // تعطيل ETag لمنع الكاش من جهة المتصفح

// إعدادات CORS
app.use(cors({
  origin: '*', // يفضل استبدالها برابط موقعك في الإنتاج
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

app.use(express.json());

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-store-secret-key-2024-secure';

// PostgreSQL Pool (أفضل ممارسة للأداء في الإنتاج)
let pgPool = null;

async function getPool() {
  if (pgPool) return pgPool;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing!");
  }

  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // ضروري لـ Neon
    max: 1, // مهم جداً لـ Serverless لمنع استهلاك الاتصالات
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000
  });

  return pgPool;
}

async function query(text, params) {
  const pool = await getPool();
  return await pool.query(text, params);
}

// Auth middleware
function authenticate(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// دالة مساعدة لتعطيل الكاش (للاستخدام في المسارات الحساسة)
const noCache = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

// ==================== ROUTES ====================

app.get('/api/health', async (req, res) => {
  noCache(res);
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// --- Auth Routes ---

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT id, name, email, password, role FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) return res.status(401).json({ error: 'البيانات غير صحيحة' });

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'البيانات غير صحيحة' });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'تم الدخول بنجاح', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { res.status(500).json({ error: 'خطأ في النظام' }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'البريد مسجل مسبقاً' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await query(
      `INSERT INTO users (name, email, password, phone, address, role) VALUES ($1, $2, $3, $4, $5, 'customer') RETURNING id, name, email, role`,
      [name, email.toLowerCase(), hashedPassword, phone, address]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'تم التسجيل بنجاح', token, user });
  } catch (error) { res.status(500).json({ error: 'فشل التسجيل' }); }
});

app.get('/api/auth/me', async (req, res) => {
  noCache(res); // البيانات الشخصية لا يجب تخزينها
  try {
    const decoded = authenticate(req);
    if (!decoded) return res.status(401).json({ error: 'غير مصرح' });
    const result = await query('SELECT id, name, email, phone, address, role FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'فشل جلب البيانات' }); }
});

// --- Products & Categories ---

app.get('/api/products', async (req, res) => {
  noCache(res); // المنتجات تتغير، نمنع الكاش لضمان التحديث
  try {
    const { category } = req.query;
    let queryStr = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      queryStr += ` AND (c.slug = $${params.length} OR c.name = $${params.length})`;
    }
    queryStr += ' ORDER BY p.created_at DESC';
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'فشل جلب المنتجات' }); }
});

app.get('/api/products/:id', async (req, res) => {
  noCache(res);
  try {
    const result = await query('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
});

app.get('/api/categories', async (req, res) => {
  noCache(res);
  try {
    const result = await query(`SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id GROUP BY c.id ORDER BY c.id ASC`);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
});

app.get('/api/settings', async (req, res) => {
  noCache(res);
  try {
    try {
        const result = await query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        if (result.rows.length > 0) return res.json(result.rows[0]);
    } catch (e) {}
    res.json({ store_name: 'KB-Medic', delivery_fee: 300 });
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
});

// --- Orders Routes (الأهم) ---

app.get('/api/orders', async (req, res) => {
  // ✅✅✅ منع الكاش نهائياً لهذا المسار لضمان ظهور الطلبات الجديدة لحظياً ✅✅✅
  noCache(res); 
  
  try {
    const decoded = authenticate(req);
    if (!decoded) return res.status(401).json({ error: 'غير مصرح' });

    let result;
    // التحقق من صلاحية الأدمن
    if (decoded.role === 'admin' || decoded.email.includes('admin')) {
      result = await query(`
        SELECT o.*, u.name as customer_name, u.email as customer_email
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);
    } else {
      result = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [decoded.userId]);
    }
    res.json(result.rows);
  } catch (error) { 
    console.error('Orders Error:', error);
    res.status(500).json({ error: 'فشل جلب الطلبات' }); 
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, customer_name, customer_phone, customer_address } = req.body;
    const decoded = authenticate(req);
    if (!items || items.length === 0) return res.status(400).json({ error: 'السلة فارغة' });

    let total = 0;
    const orderItems = [];

    // التحقق من المخزون والأسعار
    for (const item of items) {
      const pRes = await query('SELECT id, name, price FROM products WHERE id = $1', [item.product_id]);
      if (pRes.rows.length === 0) return res.status(400).json({ error: `المنتج ${item.product_id} غير موجود` });
      const product = pRes.rows[0];
      total += parseFloat(product.price) * parseInt(item.quantity);
      orderItems.push({ ...product, quantity: item.quantity });
    }

    const userId = decoded ? decoded.userId : null;
    const finalName = customer_name || (decoded ? decoded.name : 'Guest');

    // إدخال الطلب
    const orderRes = await query(
      `INSERT INTO orders (user_id, total, status, customer_name, customer_phone, customer_address) VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id, created_at`,
      [userId, total, finalName, customer_phone, customer_address]
    );
    const orderId = orderRes.rows[0].id;

    // إدخال تفاصيل الطلب
    for (const item of orderItems) {
      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.id, item.name, item.quantity, item.price]
      );
    }
    
    res.status(201).json({ message: 'تم الطلب بنجاح', order_id: orderId, total });
  } catch (error) { 
    console.error('Create Order Error:', error);
    res.status(500).json({ error: 'فشل إنشاء الطلب' }); 
  }
});

module.exports = app;
