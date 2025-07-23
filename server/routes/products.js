import express from 'express';
import { db } from '../config/firebase.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, low_stock } = req.query;
    let productsRef = db.collection('products');

    if (category) {
      productsRef = productsRef.where('category_id', '==', category);
    }

    if (search) {
      // Firestore doesn't support native text search like SQL's ILIKE.
      // This is a simple implementation. For more advanced search, consider a third-party service.
      productsRef = productsRef.where('name', '>=', search).where('name', '<=', search + '\uf8ff');
    }

    const snapshot = await productsRef.orderBy('name').get();
    
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (low_stock === 'true') {
      products = products.filter(p => p.current_stock <= p.min_stock_level);
    }

    // Add category name to each product
    const categoryPromises = products.map(p => db.collection('categories').doc(p.category_id).get());
    const categorySnapshots = await Promise.all(categoryPromises);
    const categories = categorySnapshots.reduce((acc, doc) => {
        if (doc.exists) acc[doc.id] = doc.data();
        return acc;
    }, {});

    products = products.map(p => ({
      ...p,
      category_name: categories[p.category_id]?.name || 'Uncategorized',
      stock_status: p.current_stock <= p.min_stock_level ? 'low' : (p.current_stock >= p.max_stock_level ? 'high' : 'normal')
    }));

    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const productDoc = await db.collection('products').doc(req.params.id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = { id: productDoc.id, ...productDoc.data() };

    // Fetch category name
    let category_name = 'Uncategorized';
    if (product.category_id) {
        const categoryDoc = await db.collection('categories').doc(product.category_id).get();
        if (categoryDoc.exists) {
            category_name = categoryDoc.data().name;
        }
    }

    res.json({ ...product, category_name });
  } catch (error) {
    console.error('Failed to fetch product:', error);
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

    // Check if SKU already exists
    const skuSnapshot = await db.collection('products').where('sku', '==', sku).get();
    if (!skuSnapshot.empty) {
        return res.status(400).json({ error: 'SKU already exists' });
    }

    const newProduct = {
        name, description, sku, category_id, current_stock,
        min_stock_level, max_stock_level, unit_price, 
        discounted_price: discounted_price || null, 
        supplier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(newProduct);

    // Log initial stock entry
    if (current_stock > 0) {
        await db.collection('inventory_movements').add({
            product_id: docRef.id,
            movement_type: 'IN',
            quantity: current_stock,
            previous_stock: 0,
            new_stock: current_stock,
            reason: 'Initial stock',
            user_id: req.user.uid,
            created_at: new Date().toISOString(),
        });
    }

    res.status(201).json({ id: docRef.id, ...newProduct });
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { 
        name, description, sku, category_id, min_stock_level, 
        max_stock_level, unit_price, discounted_price, supplier 
    } = req.body;
    const productRef = db.collection('products').doc(req.params.id);

    const productDoc = await productRef.get();
    if (!productDoc.exists) {
        return res.status(404).json({ error: 'Product not found' });
    }

    // Check for SKU conflict
    if (sku !== productDoc.data().sku) {
        const skuSnapshot = await db.collection('products').where('sku', '==', sku).get();
        if (!skuSnapshot.empty) {
            return res.status(400).json({ error: 'SKU already exists' });
        }
    }

    const updatedData = {
        name, description, sku, category_id, min_stock_level,
        max_stock_level, unit_price, 
        discounted_price: discounted_price || null, 
        supplier,
        updated_at: new Date().toISOString(),
    };

    await productRef.update(updatedData);

    res.json({ id: req.params.id, ...productDoc.data(), ...updatedData });
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await productRef.delete();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;