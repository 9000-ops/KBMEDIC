/**
 * API Service for Pharmacy Store Frontend
 * Handles all API calls to the backend
 */

const API_BASE = '/api';

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== AUTH ====================

async function login(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function register(name, email, password, phone, address) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone, address })
  });
}

async function getProfile() {
  return apiRequest('/auth/me');
}

async function updateProfile(data) {
  return apiRequest('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ==================== PRODUCTS ====================

async function getProducts(category = null) {
  const endpoint = category ? `/products?category=${category}` : '/products';
  return apiRequest(endpoint);
}

async function getProduct(id) {
  return apiRequest(`/products/${id}`);
}

async function createProduct(data) {
  return apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function updateProduct(id, data) {
  return apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteProduct(id) {
  return apiRequest(`/products/${id}`, {
    method: 'DELETE'
  });
}

// ==================== CATEGORIES ====================

async function getCategories() {
  return apiRequest('/categories');
}

async function createCategory(data) {
  return apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function updateCategory(id, data) {
  return apiRequest(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteCategory(id) {
  return apiRequest(`/categories/${id}`, {
    method: 'DELETE'
  });
}

// ==================== ORDERS ====================

async function getOrders() {
  return apiRequest('/orders');
}

async function getOrder(id) {
  return apiRequest(`/orders/${id}`);
}

async function createOrder(items, customerInfo = {}) {
  return apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ items, ...customerInfo })
  });
}

async function updateOrderStatus(id, status) {
  return apiRequest(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}

async function getOrderStats() {
  return apiRequest('/orders/stats/summary');
}

// ==================== USERS ====================

async function getUsers() {
  return apiRequest('/users');
}

async function updateUser(id, data) {
  return apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteUser(id) {
  return apiRequest(`/users/${id}`, {
    method: 'DELETE'
  });
}

// ==================== SETTINGS ====================

async function getSettings() {
  return apiRequest('/settings');
}

async function updateSettings(data) {
  return apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ==================== UTILS ====================

// Check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Get current user from localStorage
function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

// Check if user is admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  window.location.reload();
}

// Export all functions
window.API = {
  auth: { login, register, getProfile, updateProfile },
  products: { getProducts, getProduct, createProduct, updateProduct, deleteProduct },
  categories: { getCategories, createCategory, updateCategory, deleteCategory },
  orders: { getOrders, getOrder, createOrder, updateOrderStatus, getOrderStats },
  users: { getUsers, updateUser, deleteUser },
  settings: { getSettings, updateSettings },
  utils: { isLoggedIn, getCurrentUser, isAdmin, logout }
};
