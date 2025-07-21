import express from 'express';
import pool from '../config/database.js';
import { createAlert } from '../services/alerts.js';

const router = express.Router();

// Get inventory movements
router.get('/movements', async (req, res) => {
  try {
    const { product_id, limit = 50 } = req.query;
    let query = `
      SELECT im.*, p.name as product_name, p.sku, u.name as user_name
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (product_id) {
      paramCount++;
      query += ` AND im.product_id = $${paramCount}`;
      params.push(product_id);
    }

    query += ` ORDER BY im.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory movements' });
  }
});

// Update stock
router.post('/update-stock', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { product_id, movement_type, quantity, reason } = req.body;
    
    // Get current stock
    const productResult = await client.query(
      'SELECT current_stock, min_stock_level, name FROM products WHERE id = $1',
      [product_id]
    );
    
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const currentStock = productResult.rows[0].current_stock;
    const minStockLevel = productResult.rows[0].min_stock_level;
    const productName = productResult.rows[0].name;
    
    let newStock;
    if (movement_type === 'IN') {
      newStock = currentStock + quantity;
    } else if (movement_type === 'OUT') {
      newStock = currentStock - quantity;
      if (newStock < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock' });
      }
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid movement type' });
    }
    
    // Update product stock
    await client.query(
      'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStock, product_id]
    );
    
    // Log movement
    const movementResult = await client.query(
      `INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [product_id, movement_type, quantity, currentStock, newStock, reason, req.user.id]
    );
    
    // Check for low stock alert
    if (newStock <= minStockLevel) {
      await createAlert(client, {
        product_id,
        alert_type: 'LOW_STOCK',
        message: `${productName} is running low (${newStock} units remaining)`
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      movement: movementResult.rows[0],
      new_stock: newStock
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update stock' });
  } finally {
    client.release();
  }
});

export default router;