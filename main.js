// ========================================
// KB MEDIC - Main JavaScript File
// إصلاح شامل لجميع المشاكل
// ========================================

// ========================================
// إعدادات الثوابت والمتغيرات العامة
// ========================================

// مفاتيح التخزين المحلي
const STORAGE_KEYS = {
    PRODUCTS: 'kb_medic_products',
    CART: 'kb_medic_cart',
    CUSTOMERS: 'kb_medic_customers',
    ORDERS: 'kb_medic_orders',
    SETTINGS: 'kb_medic_settings'
};

// إعدادات الشحن
const SHIPPING_CONFIG = {
    FREE_THRESHOLD: 5000,  // توصيل مجاني للطلبات فوق 5000 دج
    STANDARD_COST: 300      // تكلفة التوصيل العادية
};

// ========================================
// دوال إدارة المنتجات
// ========================================

// الحصول على جميع المنتجات
function getProducts() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('خطأ في قراءة المنتجات:', e);
    }
    return getDefaultProducts();
}

// حفظ المنتجات
function saveProducts(products) {
    try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        return true;
    } catch (e) {
        console.error('خطأ في حفظ المنتجات:', e);
        return false;
    }
}

// إضافة منتج جديد
function addProduct(product) {
    const products = getProducts();
    const newProduct = {
        id: Date.now(),
        name: product.name,
        price: parseFloat(product.price),
        category: product.category,
        image: product.image || 'imgs/placeholder-small.svg',
        description: product.description || '',
        badge: product.badge || 'none',
        inStock: product.inStock !== false,
        createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    saveProducts(products);
    return newProduct;
}

// حذف منتج
function deleteProduct(productId) {
    const products = getProducts();
    const filtered = products.filter(p => p.id !== productId);
    saveProducts(filtered);
    return filtered.length !== products.length;
}

// تعديل منتج
function updateProduct(productId, updates) {
    const products = getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
        products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
        saveProducts(products);
        return true;
    }
    return false;
}

// المنتجات الافتراضية
function getDefaultProducts() {
    return [
        {
            id: 1,
            name: 'باراسيتامول 500 ملغ',
            price: 250,
            category: 'medicines',
            image: 'imgs/placeholder-small.svg',
            description: 'مسكن للآلام وخافض للحرارة',
            badge: 'popular',
            inStock: true
        },
        {
            id: 2,
            name: 'فيتامين سي 1000 ملغ',
            price: 1500,
            category: 'vitamins',
            image: 'imgs/placeholder-small.svg',
            description: 'تعزيز المناعة ومقاومة الأمراض',
            badge: 'new',
            inStock: true
        },
        {
            id: 3,
            name: 'أيبوبروفين 400 ملغ',
            price: 350,
            category: 'medicines',
            image: 'imgs/placeholder-small.svg',
            description: 'مضاد للالتهابات ومسكن للآلام',
            badge: 'none',
            inStock: true
        },
        {
            id: 4,
            name: 'جهاز قياس الضغط الرقمي',
            price: 3500,
            category: 'equipment',
            image: 'imgs/placeholder-small.svg',
            description: 'جهاز دقيق لقياس ضغط الدم في المنزل',
            badge: 'sale',
            inStock: true
        },
        {
            id: 5,
            name: 'كريم ترطيب بفيتامين هـ',
            price: 2200,
            category: 'beauty',
            image: 'imgs/placeholder-small.svg',
            description: 'ترطيب عميق ومغذٍّ للبشرة',
            badge: 'none',
            inStock: true
        },
        {
            id: 6,
            name: 'معجون أسنان بالفلورايد',
            price: 450,
            category: 'personal_care',
            image: 'imgs/placeholder-small.svg',
            description: 'حماية قوية من التسوس',
            badge: 'popular',
            inStock: true
        },
        {
            id: 7,
            name: 'أوميغا 3 أسماك',
            price: 2800,
            category: 'vitamins',
            image: 'imgs/placeholder-small.svg',
            description: 'مكمل غذائي لصحة القلب والدماغ',
            badge: 'none',
            inStock: true
        },
        {
            id: 8,
            name: 'شرائط قياس السكر',
            price: 1200,
            category: 'equipment',
            image: 'imgs/placeholder-small.svg',
            description: 'عبوة 50 شريط لقياس مستوى السكر',
            badge: 'none',
            inStock: true
        }
    ];
}

// ========================================
// دوال إدارة السلة
// ========================================

// الحصول على محتويات السلة
function getCart() {
    try {
        const cart = localStorage.getItem(STORAGE_KEYS.CART);
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        console.error('خطأ في قراءة السلة:', e);
        return [];
    }
}

// حفظ السلة
function saveCart(cart) {
    try {
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
        updateCartDisplay();
    } catch (e) {
        console.error('خطأ في حفظ السلة:', e);
    }
}

// إضافة منتج للسلة
function addToCart(product, quantity = 1) {
    let cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: product.image || 'imgs/placeholder-small.svg',
            quantity: quantity
        });
    }
    
    saveCart(cart);
    showToast('تمت إضافة المنتج للسلة ✅', 'success');
    
    // فتح السلة تلقائياً
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
    }
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    showToast('تم إزالة المنتج من السلة', 'success');
}

// تحديث كمية منتج
function updateCartQuantity(productId, quantity) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            saveCart(cart);
        }
    }
}

// إفراغ السلة
function clearCart() {
    saveCart([]);
    showToast('تم إفراغ السلة', 'success');
}

// حساب المجموع الفرعي
function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
}

// حساب تكلفة الشحن
function getShippingCost() {
    const subtotal = getCartSubtotal();
    if (subtotal === 0) return 0;
    if (subtotal >= SHIPPING_CONFIG.FREE_THRESHOLD) return 0;
    return SHIPPING_CONFIG.STANDARD_COST;
}

// حساب المجموع الكلي
function getCartTotal() {
    return getCartSubtotal() + getShippingCost();
}

// تحديث عرض السلة
function updateCartDisplay() {
    const cart = getCart();
    const subtotal = getCartSubtotal();
    const shipping = getShippingCost();
    const total = subtotal + shipping;
    
    // تحديث عنصر عدد المنتجات في السلة
    const cartCountElements = document.querySelectorAll('.cart-count');
    const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
    cartCountElements.forEach(el => {
        el.textContent = itemCount;
        el.style.display = itemCount > 0 ? 'inline' : 'none';
    });
    
    // تحديث محتوى السلة
    const cartItemsContainer = document.getElementById('cartItems');
    if (cartItemsContainer) {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-basket" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <p style="color: #666;">السلة فارغة</p>
                    <button class="btn btn-primary" onclick="window.location.href='index.html#products'" style="margin-top: 15px;">
                        تصفح المنتجات
                    </button>
                </div>
            `;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='imgs/placeholder-small.svg'">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${parseFloat(item.price).toLocaleString()} دج</div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // تحديث المجاميع
    const cartTotalElements = document.querySelectorAll('.cart-total .total-price, #cartTotal');
    cartTotalElements.forEach(el => {
        el.textContent = total.toLocaleString() + ' دج';
    });
    
    // تحديث المجموع الفرعي
    const subtotalElements = document.querySelectorAll('.subtotal-value, #cartSubtotal');
    subtotalElements.forEach(el => {
        el.textContent = subtotal.toLocaleString() + ' دج';
    });
    
    // تحديث تكلفة الشحن
    const shippingElements = document.querySelectorAll('.shipping-value, #cartShipping');
    shippingElements.forEach(el => {
        el.textContent = shipping > 0 ? shipping.toLocaleString() + ' دج' : 'مجاني';
        el.style.color = shipping === 0 ? '#22c55e' : '#666';
    });
}

// إتمام الشراء
function checkout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('السلة فارغة! أضف منتجات أولاً', 'error');
        return;
    }
    
    // التحقق من تسجيل الدخول
    const customer = getCurrentCustomer();
    if (!customer) {
        showToast('يرجى تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    // إنشاء الطلب
    const order = {
        id: 'ORD-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
        customerId: customer.id || customer.email,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        items: cart,
        subtotal: getCartSubtotal(),
        shipping: getShippingCost(),
        total: getCartTotal(),
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // حفظ الطلب
    try {
        const orders = getOrdersFromStorage();
        orders.push(order);
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
        
        // إفراغ السلة
        saveCart([]);
        
        showToast('تم الطلب بنجاح! شكراً لثقتك بنا', 'success');
        
        // التحويل لصفحة تأكيد الطلب
        setTimeout(() => {
            window.location.href = 'customer-dashboard.html';
        }, 2000);
        
    } catch (e) {
        console.error('خطأ في إنشاء الطلب:', e);
        showToast('حدث خطأ، يرجى المحاولة لاحقاً', 'error');
    }
}

// ========================================
// دوال البحث والتصفية
// ========================================

// تصفية المنتجات
function filterProducts(category = null, searchTerm = null) {
    let products = getProducts();
    
    // تصفية حسب الفئة
    if (category && category !== 'all') {
        products = products.filter(p => p.category === category);
    }
    
    // تصفية حسب البحث
    if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        products = products.filter(p => 
            p.name.toLowerCase().includes(term) || 
            p.description.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        );
    }
    
    return products;
}

// عرض المنتجات
function renderProducts(products = null) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    const displayProducts = products || getProducts();
    
    if (displayProducts.length === 0) {
        grid.innerHTML = `
            <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
                <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p style="color: #666; font-size: 1.1rem;">لا توجد منتجات متاحة</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = displayProducts.map(product => `
        <div class="product-card" data-id="${product.id}" data-category="${product.category}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.src='imgs/placeholder-small.svg'">
                ${product.badge !== 'none' ? `
                    <span class="product-badge ${product.badge}">
                        ${product.badge === 'new' ? 'جديد' : 
                          product.badge === 'sale' ? 'خصم' : 
                          product.badge === 'popular' ? 'مميز' : ''}
                    </span>
                ` : ''}
                <button class="quick-view-btn" onclick="quickView(${product.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div class="product-info">
                <span class="product-category">${getCategoryName(product.category)}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-desc">${product.description || 'منتج عالي الجودة'}</p>
                <div class="product-footer">
                    <span class="product-price">${parseFloat(product.price).toLocaleString()} دج</span>
                    <button class="add-to-cart-btn" onclick="handleAddToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i>
                        إضافة للسلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// الحصول على اسم الفئة بالعربية
function getCategoryName(category) {
    const categories = {
        'medicines': 'الأدوية',
        'vitamins': 'الفيتامينات',
        'equipment': 'المعدات الطبية',
        'beauty': 'التجميل',
        'personal_care': 'العناية الشخصية'
    };
    return categories[category] || category;
}

// ========================================
// دالة إضافة للسلة (معالجة المنتج من البيانات)
// ========================================

function handleAddToCart(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (product) {
        addToCart(product);
    }
}

// ========================================
// دوال المصادقة وإدارة العملاء
// ========================================

const AUTH_TOKEN_KEY = 'kb_medic_auth_token';
const CURRENT_CUSTOMER_KEY = 'kb_medic_current_customer';

function isLoggedIn() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return !!token;
}

function getCurrentCustomer() {
    try {
        const customer = localStorage.getItem(CURRENT_CUSTOMER_KEY);
        return customer ? JSON.parse(customer) : null;
    } catch (e) {
        return null;
    }
}

async function loginUser(email, password) {
    const customers = getCustomersFromStorage();
    const customer = customers.find(c => c.email === email || c.phone === email);
    
    if (customer && customer.password === password) {
        const token = 'token_' + Date.now();
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(customer));
        return { success: true, token, customer };
    }
    
    return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
}

async function registerUser(name, email, phone, password) {
    const customers = getCustomersFromStorage();
    
    if (customers.find(c => c.email === email)) {
        return { success: false, message: 'البريد الإلكتروني مسجل بالفعل' };
    }
    
    const newCustomer = {
        id: Date.now(),
        name,
        email,
        phone,
        password,
        createdAt: new Date().toISOString()
    };
    
    customers.push(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    
    const token = 'token_' + Date.now();
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(newCustomer));
    
    return { success: true, token, customer: newCustomer };
}

function logoutUser() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_CUSTOMER_KEY);
    showToast('تم تسجيل الخروج', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ========================================
// دوال إدارة العملاء (تخزين محلي)
// ========================================

function getCustomersFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

// ========================================
// دوال إدارة الطلبات
// ========================================

function getOrdersFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

// ========================================
// دوال إعدادات الموقع
// ========================================

function getSiteSettings() {
    try {
        const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return settings ? JSON.parse(settings) : getDefaultSettings();
    } catch (e) {
        return getDefaultSettings();
    }
}

function saveSiteSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function getDefaultSettings() {
    return {
        siteName: 'KB MEDIC',
        heroTitle: 'أفضل المنتجات شبه الصيدلانية<br>في الجزائر',
        heroSubtitle: 'نقدم لكم مجموعة واسعة من المنتجات شبه الصيدلانية<br>مع ضمان الجودة والأصالة',
        freeShippingThreshold: 5000,
        shippingCost: 300,
        contactPhone: '0770142125',
        contactEmail: 'kbmedic19@gmail.com'
    };
}

// ========================================
// دوال واجهة المستخدم
// ========================================

// إظهار رسالة toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = 'toast ' + type + ' show';
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
}

// تبديل اللغة
function toggleLanguage() {
    console.log('Language toggle clicked');
}

// تبديل السلة
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.toggle('open');
        cartOverlay.classList.toggle('open');
    }
}

// عرض سريع للمنتج
function quickView(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    const modal = document.getElementById('quickViewModal');
    const modalContent = document.getElementById('quickViewContent');
    
    if (modal && modalContent) {
        modalContent.innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='imgs/placeholder-medium.svg'">
                </div>
                <div class="quick-view-info">
                    <span class="product-category">${getCategoryName(product.category)}</span>
                    <h2>${product.name}</h2>
                    <p class="product-price">${parseFloat(product.price).toLocaleString()} دج</p>
                    <p class="product-desc">${product.description || 'منتج عالي الجودة'}</p>
                    <div class="quantity-selector">
                        <button onclick="updateQuickViewQuantity(-1)">-</button>
                        <input type="number" id="quickViewQty" value="1" min="1">
                        <button onclick="updateQuickViewQuantity(1)">+</button>
                    </div>
                    <button class="btn btn-primary" onclick="addToCartFromQuickView(${product.id})">
                        <i class="fas fa-cart-plus"></i> إضافة للسلة
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }
}

let quickViewProductId = null;

function updateQuickViewQuantity(delta) {
    const qtyInput = document.getElementById('quickViewQty');
    if (qtyInput) {
        let qty = parseInt(qtyInput.value) + delta;
        if (qty < 1) qty = 1;
        qtyInput.value = qty;
    }
}

function addToCartFromQuickView(productId) {
    const qtyInput = document.getElementById('quickViewQty');
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;
    
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (product) {
        addToCart(product, quantity);
        closeQuickView();
    }
}

function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ========================================
// تهيئة الصفحة عند التحميل
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // تحديث عرض السلة
    updateCartDisplay();
    
    // تحميل المنتجات على الصفحة الرئيسية
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        renderProducts();
    }
    
    // إعداد مستمعي الأحداث للبحث والتصفية
    setupSearchAndFilter();
    
    // إعداد أحداث السلة
    setupCartEvents();
    
    // التحقق من تسجيل الدخول للصفحات المحمية
    checkProtectedPages();
    
    // تحميل إعدادات الموقع
    applySiteSettings();
});

// إعداد البحث والتصفية
function setupSearchAndFilter() {
    // عنصر البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value;
            const activeCategory = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            const filteredProducts = filterProducts(activeCategory, searchTerm);
            renderProducts(filteredProducts);
        });
    }
    
    // أزرار الفئات
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // تحديث النشط
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // تصفية المنتجات
            const category = this.dataset.filter || 'all';
            const searchTerm = document.getElementById('searchInput')?.value || '';
            const filteredProducts = filterProducts(category, searchTerm);
            renderProducts(filteredProducts);
        });
    });
    
    // روابط الفئات في القائمة
    const categoryLinks = document.querySelectorAll('.category-card');
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.dataset.category || this.onclick?.match(/'([^']+)'/)?.[1];
            if (category) {
                // الانتقال لصفحة المنتجات
                window.location.href = 'index.html#products';
                
                // تفعيل الفلتر بعد قليل
                setTimeout(() => {
                    const filterBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
                    if (filterBtn) {
                        filterBtn.click();
                    }
                }, 100);
            }
        });
    });
}

// إعداد أحداث السلة
function setupCartEvents() {
    // زر إتمام الشراء
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
    
    // زر متابعة التسوق
    const continueShoppingBtn = document.querySelector('.continue-shopping');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', toggleCart);
    }
    
    // إغلاق السلة عند النقر على Overlay
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', toggleCart);
    }
    
    // إغلاق النافذة السريعة
    const quickViewModal = document.getElementById('quickViewModal');
    if (quickViewModal) {
        quickViewModal.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('modal-overlay')) {
                closeQuickView();
            }
        });
    }
}

// التحقق من الصفحات المحمية
function checkProtectedPages() {
    const protectedPages = ['customer-dashboard.html', 'orders-admin.html', 'products-admin.html', 'admin-login.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (protectedPages.includes(currentPage)) {
        // صفحة تسجيل دخول المسؤول
        if (currentPage === 'admin-login.html') {
            if (localStorage.getItem('kbMedicAdmin')) {
                window.location.href = 'customers-admin.html';
            }
            return;
        }
        
        // صفحات المسؤولين تتطلب صلاحيات المسؤول
        if (['customers-admin.html', 'orders-admin.html', 'products-admin.html'].includes(currentPage)) {
            const adminSession = localStorage.getItem('kbMedicAdmin');
            if (!adminSession) {
                window.location.href = 'admin-login.html';
            }
            return;
        }
        
        // صفحات العملاء تتطلب تسجيل الدخول
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
        }
    }
}

// تطبيق إعدادات الموقع
function applySiteSettings() {
    const settings = getSiteSettings();
    
    // تحديث العنوان
    const heroTitle = document.querySelector('.hero-title, .hero-content h1');
    if (heroTitle && settings.heroTitle) {
        heroTitle.innerHTML = settings.heroTitle;
    }
    
    // تحديث العنوان الفرعي
    const heroSubtitle = document.querySelector('.hero-subtitle, .hero-content p');
    if (heroSubtitle && settings.heroSubtitle) {
        heroSubtitle.innerHTML = settings.heroSubtitle;
    }
    
    // تحديث معلومات الاتصال
    const contactPhone = document.querySelector('.contact-info-list a[href^="tel:"]');
    if (contactPhone && settings.contactPhone) {
        contactPhone.textContent = settings.contactPhone;
        contactPhone.href = 'tel:' + settings.contactPhone;
    }
    
    const contactEmail = document.querySelector('.contact-info-list a[href^="mailto:"]');
    if (contactEmail && settings.contactEmail) {
        contactEmail.textContent = settings.contactEmail;
        contactEmail.href = 'mailto:' + settings.contactEmail;
    }
}

// ========================================
// تصدير الدوال للنافذة العامة
// ========================================

window.getProducts = getProducts;
window.saveProducts = saveProducts;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.updateProduct = updateProduct;
window.renderProducts = renderProducts;
window.filterProducts = filterProducts;

window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.clearCart = clearCart;
window.getCartTotal = getCartTotal;
window.updateCartDisplay = updateCartDisplay;
window.checkout = checkout;

window.toggleCart = toggleCart;
window.quickView = quickView;
window.closeQuickView = closeQuickView;
window.showToast = showToast;
window.toggleLanguage = toggleLanguage;

window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.isLoggedIn = isLoggedIn;
window.getCurrentCustomer = getCurrentCustomer;

window.getSiteSettings = getSiteSettings;
window.saveSiteSettings = saveSiteSettings;
