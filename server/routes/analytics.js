import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total products
      pool.query('SELECT COUNT(*) as total_products FROM products'),
      
      // Low stock products
      pool.query('SELECT COUNT(*) as low_stock_products FROM products WHERE current_stock <= min_stock_level'),
      
      // Total categories
      pool.query('SELECT COUNT(*) as total_categories FROM categories'),
      
      // Recent movements (last 24 hours)
      pool.query(`
        SELECT COUNT(*) as recent_movements 
        FROM inventory_movements 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `),
      
      // Stock distribution by category
      pool.query(`
        SELECT c.name as category, 
               SUM(p.current_stock) as total_stock,
               COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id, c.name
        ORDER BY total_stock DESC
      `),
      
      // Movement trends (last 7 days)
      pool.query(`
        SELECT DATE(created_at) as date,
               movement_type,
               SUM(quantity) as total_quantity
        FROM inventory_movements
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at), movement_type
        ORDER BY date DESC
      `)
    ]);

    res.json({
      total_products: parseInt(stats[0].rows[0].total_products),
      low_stock_products: parseInt(stats[1].rows[0].low_stock_products),
      total_categories: parseInt(stats[2].rows[0].total_categories),
      recent_movements: parseInt(stats[3].rows[0].recent_movements),
      stock_by_category: stats[4].rows,
      movement_trends: stats[5].rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get product performance
router.get('/products/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.sku, p.current_stock,
             COALESCE(SUM(CASE WHEN im.movement_type = 'OUT' THEN im.quantity ELSE 0 END), 0) as total_out,
             COALESCE(SUM(CASE WHEN im.movement_type = 'IN' THEN im.quantity ELSE 0 END), 0) as total_in,
             COUNT(im.id) as movement_count
      FROM products p
      LEFT JOIN inventory_movements im ON p.id = im.product_id
      WHERE im.created_at >= NOW() - INTERVAL '30 days' OR im.created_at IS NULL
      GROUP BY p.id, p.name, p.sku, p.current_stock
      ORDER BY total_out DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product performance data' });
  }
});

export default router;