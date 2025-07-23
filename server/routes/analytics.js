import express from 'express';
import { db } from '../config/firebase.js';
import { subDays, format, startOfDay } from 'date-fns';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Basic counts
    const productsPromise = db.collection('products').get();
    const categoriesPromise = db.collection('categories').get();

    // Recent movements (last 24 hours)
    const twentyFourHoursAgo = subDays(new Date(), 1).toISOString();
    const recentMovementsPromise = db.collection('inventory_movements')
      .where('created_at', '>=', twentyFourHoursAgo)
      .get();

    const [productsSnapshot, categoriesSnapshot, recentMovementsSnapshot] = await Promise.all([
      productsPromise,
      categoriesPromise,
      recentMovementsPromise,
    ]);

    const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Low stock products
    const lowStockProducts = allProducts.filter(p => p.current_stock <= p.min_stock_level).length;

    // Stock distribution by category
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const stockByCategory = categories.map(category => ({
      category: category.name,
      total_stock: 0,
      product_count: 0,
    }));

    const categoryMap = new Map(stockByCategory.map(c => [c.category, c]));

    for (const product of allProducts) {
        const category = categories.find(c => c.id === product.category_id);
        if (category) {
            const catData = categoryMap.get(category.name);
            if(catData) {
                catData.total_stock += product.current_stock;
                catData.product_count += 1;
            }
        }
    }

    // Movement trends (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    const movementsSnapshot = await db.collection('inventory_movements')
      .where('created_at', '>=', sevenDaysAgo)
      .get();

    const movementTrends = movementsSnapshot.docs.reduce((acc, doc) => {
      const movement = doc.data();
      const date = format(startOfDay(new Date(movement.created_at)), 'yyyy-MM-dd');
      const key = `${date}|${movement.movement_type}`;

      if (!acc[key]) {
        acc[key] = { date, movement_type: movement.movement_type, total_quantity: 0 };
      }
      acc[key].total_quantity += movement.quantity;
      return acc;
    }, {});

    res.json({
      total_products: productsSnapshot.size,
      low_stock_products: lowStockProducts,
      total_categories: categoriesSnapshot.size,
      recent_movements: recentMovementsSnapshot.size,
      stock_by_category: Array.from(categoryMap.values()).sort((a, b) => b.total_stock - a.total_stock),
      movement_trends: Object.values(movementTrends).sort((a, b) => new Date(b.date) - new Date(a.date)),
    });
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get product performance
router.get('/products/performance', async (req, res) => {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const movementsSnapshot = await db.collection('inventory_movements')
      .where('created_at', '>=', thirtyDaysAgo)
      .get();

    const productPerformance = {};

    movementsSnapshot.docs.forEach(doc => {
      const movement = doc.data();
      const { product_id, movement_type, quantity } = movement;

      if (!productPerformance[product_id]) {
        productPerformance[product_id] = { total_in: 0, total_out: 0, movement_count: 0 };
      }

      if (movement_type === 'IN') {
        productPerformance[product_id].total_in += quantity;
      } else if (movement_type === 'OUT') {
        productPerformance[product_id].total_out += quantity;
      }
      productPerformance[product_id].movement_count += 1;
    });

    const productsSnapshot = await db.collection('products').get();
    const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const performanceData = allProducts.map(product => ({
      ...product,
      ...(productPerformance[product.id] || { total_in: 0, total_out: 0, movement_count: 0 }),
    }));

    const sortedPerformance = performanceData.sort((a, b) => b.total_out - a.total_out).slice(0, 10);

    res.json(sortedPerformance);
  } catch (error) {
    console.error('Failed to fetch product performance data:', error);
    res.status(500).json({ error: 'Failed to fetch product performance data' });
  }
});

export default router;