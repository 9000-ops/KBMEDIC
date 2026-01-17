// ========================================
// KB MEDIC - Main JavaScript File
// يعمل مع Neon PostgreSQL API
// ========================================

// إعدادات API
const API_BASE = ''; // فارغ لأن Vercel يقدم من نفس النطاق

// ========================================
// دوال إدارة المنتجات (API)
// ========================================

// الحصول على جميع المنتجات من API
async function getProducts() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const data = await response.json();
        
        if (data.products) {
            return data.products;
        }
    } catch (error) {
        console.error('خطأ في جلب المنتجات:', error);
    }
    return [];
}

// إضافة منتج جديد (API)
async function addProduct(productData) {
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('خطأ في إضافة المنتج:', error);
        return { error: 'حدث خطأ' };
    }
}

// حذف منتج (API)
async function deleteProduct(productId) {
    try {
        const response = await fetch(`/api/products?id=${productId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('خطأ في حذف المنتج:', error);
        return { error: 'حدث خطأ' };
    }
}

// ========================================
// دوال إدارة السلة (localStorage للسلة فقط)
// ========================================

const CART_STORAGE_KEY = 'kb_medic_cart';

// الحصول على محتويات السلة
function getCart() {
    try {
        const cart = localStorage.getItem(CART_STORAGE_KEY);
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        return [];
    }
}

// حفظ السلة
function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
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
    
    // فتح السلة
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

// ========================================
// حساب المجاميع
// ========================================

function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
}

function getShippingCost() {
    const subtotal = getCartSubtotal();
    if (subtotal === 0) return 0;
    if (subtotal >= 5000) return 0;
    return 300;
}

function getCartTotal() {
    return getCartSubtotal() + getShippingCost();
}

// تحديث عرض السلة
function updateCartDisplay() {
    const cart = getCart();
    const subtotal = getCartSubtotal();
    const shipping = getShippingCost();
    const total = subtotal + shipping;
    
    // تحديث عدد المنتجات
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
}

// ========================================
// دوال البحث والتصفية
// ========================================

let allProducts = [];

async function loadProducts() {
    const products = await getProducts();
    allProducts = products;
    renderProducts(products);
}

function filterProducts(category = null, searchTerm = null) {
    let products = [...allProducts];
    
    if (category && category !== 'all') {
        products = products.filter(p => p.category === category);
    }
    
    if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        products = products.filter(p => 
            p.name?.toLowerCase().includes(term) || 
            p.description?.toLowerCase().includes(term) ||
            p.category?.toLowerCase().includes(term)
        );
    }
    
    renderProducts(products);
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
                <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p style="color: #666; font-size: 1.1rem;">لا توجد منتجات متاحة</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}" data-category="${product.category}">
            <div class="product-image">
                <img src="${product.image || 'imgs/placeholder-small.svg'}" alt="${product.name}" onerror="this.src='imgs/placeholder-small.svg'">
                ${product.badge && product.badge !== 'none' ? `
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
                    <span class="product-price">${parseFloat(product.price || 0).toLocaleString()} دج</span>
                    <button class="add-to-cart-btn" onclick="handleAddToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i>
                        إضافة للسلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getCategoryName(category) {
    const categories = {
        'medicines': 'الأدوية',
        'vitamins': 'الفيتامينات',
        'equipment': 'المعدات الطبية',
        'beauty': 'التجميل',
        'personal_care': 'العناية الشخصية'
    };
    return categories[category] || category || 'أخرى';
}

function handleAddToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        addToCart(product);
    }
}

// ========================================
// دوال المصادقة (API)
// ========================================

async function loginUser(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone: email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return { success: false, message: 'حدث خطأ في الاتصال' };
    }
}

async function registerUser(name, email, phone, password) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, emailOrPhone: email, phone, password })
        });
        return await response.json();
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        return { success: false, message: 'حدث خطأ في الاتصال' };
    }
}

// ========================================
// دوال واجهة المستخدم
// ========================================

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

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.toggle('open');
        cartOverlay.classList.toggle('open');
    }
}

// ========================================
// تهيئة الصفحة
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    updateCartDisplay();
    loadProducts();
    setupSearchAndFilter();
    setupCartEvents();
});

// إعداد البحث والتصفية
function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value;
            const activeCategory = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
            filterProducts(activeCategory, searchTerm);
        });
    }
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.filter || 'all';
            const searchTerm = document.getElementById('searchInput')?.value || '';
            filterProducts(category, searchTerm);
        });
    });
}

function setupCartEvents() {
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            const cart = getCart();
            if (cart.length === 0) {
                showToast('السلة فارغة!', 'error');
                return;
            }
            showToast('جاري إنشاء الطلب...', 'success');
        });
    }
}

// تصدير للدوال العالمية
window.getProducts = getProducts;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.renderProducts = renderProducts;
window.filterProducts = filterProducts;
window.loadProducts = loadProducts;

window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.clearCart = clearCart;
window.getCartTotal = getCartTotal;
window.updateCartDisplay = updateCartDisplay;

window.toggleCart = toggleCart;
window.showToast = showToast;

window.loginUser = loginUser;
window.registerUser = registerUser;
