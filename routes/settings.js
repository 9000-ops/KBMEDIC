/**
 * Settings Routes
 * Store settings management
 */

const express = require('express');
const db = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get settings (public)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        store_name: 'صيدلية الشفاء',
        phone: '',
        delivery_fee: 15.00
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (admin only)
router.put('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { store_name, phone, delivery_fee } = req.body;

    // Check if settings exist
    const existing = await db.query('SELECT id FROM settings ORDER BY id DESC LIMIT 1');

    if (existing.rows.length === 0) {
      // Create new settings
      const result = await db.query(`
        INSERT INTO settings (store_name, phone, delivery_fee)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [store_name, phone, delivery_fee]);
      
      return res.json({
        message: 'Settings created successfully',
        settings: result.rows[0]
      });
    }

    // Update existing settings
    const result = await db.query(`
      UPDATE settings
      SET store_name = COALESCE($1, store_name),
          phone = COALESCE($2, phone),
          delivery_fee = COALESCE($3, delivery_fee),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [store_name, phone, delivery_fee, existing.rows[0].id]);

    res.json({
      message: 'Settings updated successfully',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
