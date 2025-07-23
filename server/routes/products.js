import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products with category info
router.get('/', async (req, res) => {
  try {
    const { category, search, low_stock } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
             CASE 
               WHEN p.current_stock <= p.min_stock_level THEN 'low'
               WHEN p.current_stock >= p.max_stock_level THEN 'high'
               ELSE 'normal'
             END as stock_status
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (low_stock === 'true') {
      query += ` AND p.current_stock <= p.min_stock_level`;
    }

    query += ' ORDER BY p.name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name, description, sku, category_id, current_stock,
      min_stock_level, max_stock_level, unit_price, discounted_price, supplier
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (name, description, sku, category_id, current_stock, 
                           min_stock_level, max_stock_level, unit_price, discounted_price, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, description, sku, category_id, current_stock, min_stock_level, max_stock_level, unit_price, discounted_price || null, supplier]
    );

    // Log initial stock entry
    if (current_stock > 0) {
      await pool.query(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason, user_id)
         VALUES ($1, 'IN', $2, 0, $2, 'Initial stock', $3)`,
        [result.rows[0].id, current_stock, req.user.id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      name, description, sku, category_id, min_stock_level, max_stock_level, unit_price, discounted_price, supplier
    } = req.body;

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, sku = $3, category_id = $4, 
           min_stock_level = $5, max_stock_level = $6, unit_price = $7, discounted_price = $8, supplier = $9, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, description, sku, category_id, min_stock_level, max_stock_level, unit_price, discounted_price || null, supplier, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;