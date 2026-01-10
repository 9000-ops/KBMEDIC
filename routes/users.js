/**
 * User Routes
 * User management (admin panel)
 */

const express = require('express');
const db = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, phone, address, role, created_at,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id AND status IN ('completed', 'shipped')) as total_spent
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user (admin only)
router.get('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, phone, address, role, created_at,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id) as total_spent
      FROM users
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, email, phone, address, role } = req.body;

    // Check if email is being changed and already exists
    if (email) {
      const existing = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.params.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const result = await db.query(`
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          role = COALESCE($5, role)
      WHERE id = $6
      RETURNING id, name, email, phone, address, role
    `, [name, email, phone, address, role, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Prevent deleting self
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await db.query(
      'DELETE FROM users WHERE id = $1 AND role != $2 RETURNING id',
      [req.params.id, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or cannot delete admin' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
