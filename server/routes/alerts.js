import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get alerts
router.get('/', async (req, res) => {
  try {
    const { unread_only } = req.query;
    let query = `
      SELECT a.*, p.name as product_name, p.sku
      FROM alerts a
      LEFT JOIN products p ON a.product_id = p.id
      WHERE 1=1
    `;
    
    if (unread_only === 'true') {
      query += ' AND a.is_read = FALSE';
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Mark alert as read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE alerts SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// Mark all alerts as read
router.put('/mark-all-read', async (req, res) => {
  try {
    await pool.query('UPDATE alerts SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE is_read = FALSE');
    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark alerts as read' });
  }
});

export default router;