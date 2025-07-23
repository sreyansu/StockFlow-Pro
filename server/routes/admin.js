import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Approve a user (admin only)
router.put('/users/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  console.log(`[ADMIN] Attempting to approve user with ID: ${req.params.id}`);
  console.log(`Attempting to approve user with ID: ${req.params.id}`);
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE users SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING id, name, email, role, status",
      [id]
    );
    console.log('[ADMIN] Database query result:', result.rows);

    console.log('Database query result:', result.rows);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already approved' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving user:', error);
    console.log('Failed to approve user. ID:', req.params.id);
    console.error('[ADMIN] Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, status',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete a user (admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
