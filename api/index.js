// Vercel Serverless API Handler
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // استدعاء المكتبة هنا أفضل

const app = express();

// إعدادات CORS مهمة جداً للتواصل مع الواجهة الأمامية
app.use(cors({
  origin: '*', // يمكن تغييرها لرابط موقعك للأمان
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-store-secret-key-2024-secure';

// PostgreSQL client for serverless (Global Variable)
let pgPool = null;

// دالة الاتصال المحسنة
async function getPool() {
  if (pgPool) return pgPool;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing!");
  }

  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // ضروري لـ Neon
    },
    max: 1, // تقليل الاتصالات في بيئة Serverless
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000
  });

  // اختبار الاتصال (يظهر في Logs في Vercel)
  try {
    const client = await pgPool.connect();
    console.log("✅ Database connected successfully to Neon");
    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    pgPool = null; // إعادة تعيين الـ Pool للمحاولة مرة أخرى
    throw err;
  }
  
  return pgPool;
}

// دالة تنفيذ الاستعلامات
async function query(text, params) {
  try {
    const pool = await getPool();
    return await pool.query(text, params);
  } catch (error) {
    console.error('Query Error:', error.message);
    throw error;
  }
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
app.get('/api/health', async (req, res) => {
  try {
    // نجرب اتصال بسيط للتأكد من قاعدة البيانات
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const result = await query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'فشل تسجيل الدخول' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(`
      INSERT INTO users (name, email, password, phone, address, role)
      VALUES ($1, $2, $3, $4, $5, 'customer')
      RETURNING id, name, email, role
    `, [name, email.toLowerCase(), hashedPassword, phone, address]);

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'فشل إنشاء الحساب' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const decoded = authenticate(req);
    if (!decoded) return res.status(401).json({ error: 'غير مصرح' });

    const result = await query(
      'SELECT id, name, email, phone, address, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'فشل جلب البيانات' });
  }
});

// ==================== PRODUCTS ROUTES ====================

app.get('/api/products', async (req, res) => {
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
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'فشل تحميل المنتجات' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل المنتج' });
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
    res.status(500).json({ error: 'فشل تحميل الفئات' });
  }
});

// ==================== SETTINGS ROUTES ====================

app.get('/api/settings', async (req, res) => {
  try {
    // محاولة جلب الإعدادات، وإذا فشل نرجع إعدادات افتراضية
    try {
        const result = await query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }
    } catch (e) {
        console.warn("Settings table might not exist yet.");
    }
    
    res.json({ store_name: 'KB-Medic', delivery_fee: 300 });

  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل الإعدادات' });
  }
});

// ==================== ORDERS ROUTES ====================

app.post('/api/orders', async (req, res) => {
  try {
    const { items, customer_name, customer_phone, customer_address } = req.body;
    const decoded = authenticate(req);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'سلة المشتريات فارغة' });
    }

    let total = 0;
    const orderItems = [];

    // التحقق من المنتجات وحساب المجموع
    for (const item of items) {
      const productResult = await query('SELECT id, name, price FROM products WHERE id = $1', [item.product_id]);
      if (productResult.rows.length === 0) {
        return res.status(400).json({ error: `المنتج رقم ${item.product_id} غير موجود` });
      }
      const product = productResult.rows[0];
      total += parseFloat(product.price) * parseInt(item.quantity);
      orderItems.push({ ...product, quantity: item.quantity });
    }

    const userId = decoded ? decoded.userId : null;
    const finalName = customer_name || (decoded ? decoded.name : 'Guest');

    // إنشاء الطلب
    const orderResult = await query(`
      INSERT INTO orders (user_id, total, status, customer_name, customer_phone, customer_address)
      VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id, created_at
    `, [userId, total, finalName, customer_phone, customer_address]);

    const orderId = orderResult.rows[0].id;

    // إضافة عناصر الطلب
    for (const item of orderItems) {
      await query(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, item.id, item.name, item.quantity, item.price]);
    }

    res.status(201).json({
      message: 'تم إنشاء الطلب بنجاح',
      order_id: orderId,
      total,
      created_at: orderResult.rows[0].created_at
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'فشل إنشاء الطلب' });
  }
});

// Vercel يحتاج لهذا السطر ليقوم بتشغيل التطبيق
module.exports = app;
