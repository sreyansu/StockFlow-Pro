import express from 'express';
import { db } from '../config/firebase.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all categories with product counts
router.get('/', async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection('categories').orderBy('name').get();
    const productsSnapshot = await db.collection('products').get();

    const productCounts = productsSnapshot.docs.reduce((acc, doc) => {
      const categoryId = doc.data().category_id;
      if (categoryId) {
        acc[categoryId] = (acc[categoryId] || 0) + 1;
      }
      return acc;
    }, {});

    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      product_count: productCounts[doc.id] || 0,
    }));

    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const newCategory = {
      name,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const docRef = await db.collection('categories').add(newCategory);
    res.status(201).json({ id: docRef.id, ...newCategory });
  } catch (error) {
    console.error('Failed to create category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryRef = db.collection('categories').doc(req.params.id);

    const doc = await categoryRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedData = {
      name,
      description,
      updated_at: new Date().toISOString(),
    };

    await categoryRef.update(updatedData);
    res.json({ id: req.params.id, ...updatedData });
  } catch (error) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const categoryId = req.params.id;
  try {
    const categoryRef = db.collection('categories').doc(categoryId);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Find and update products associated with this category
    const productsToUpdateSnapshot = await db.collection('products').where('category_id', '==', categoryId).get();
    
    if (!productsToUpdateSnapshot.empty) {
      const batch = db.batch();
      productsToUpdateSnapshot.docs.forEach(productDoc => {
        batch.update(productDoc.ref, { category_id: null });
      });
      await batch.commit();
    }

    // Delete the category
    await categoryRef.delete();
    
    res.json({ message: 'Category and associated product links deleted successfully' });
  } catch (error) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;