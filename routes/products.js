/**
 * Product Routes
 * CRUD operations for products
 */

const express = require('express');
const db = require('../database');
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND p.category_id = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product (public)
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, price, old_price, category_id, image, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await db.query(`
      INSERT INTO products (name, price, old_price, category_id, image, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, price, old_price, category_id, image, description]);

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, price, old_price, category_id, image, description } = req.body;

    const result = await db.query(`
      UPDATE products
      SET name = COALESCE($1, name),
          price = COALESCE($2, price),
          old_price = COALESCE($3, old_price),
          category_id = COALESCE($4, category_id),
          image = COALESCE($5, image),
          description = COALESCE($6, description)
      WHERE id = $7
      RETURNING *
    `, [name, price, old_price, category_id, image, description, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
