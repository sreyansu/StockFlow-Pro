import express from 'express';
import { db } from '../config/firebase.js';
import { createAlert } from '../services/alerts.js';

const router = express.Router();

// Get inventory movements
router.get('/movements', async (req, res) => {
  try {
    const { product_id, limit = 50 } = req.query;
    let query = db.collection('inventory_movements');

    if (product_id) {
      query = query.where('product_id', '==', product_id);
    }

    const snapshot = await query.orderBy('created_at', 'desc').limit(Number(limit)).get();
    
    const movements = await Promise.all(snapshot.docs.map(async (doc) => {
        const movement = { id: doc.id, ...doc.data() };
        
        // Fetch product and user details
        const productDoc = await db.collection('products').doc(movement.product_id).get();
        const userDoc = await db.collection('users').doc(movement.user_id).get();

        return {
            ...movement,
            product_name: productDoc.exists ? productDoc.data().name : 'Unknown Product',
            sku: productDoc.exists ? productDoc.data().sku : 'N/A',
            user_name: userDoc.exists ? userDoc.data().name : 'System'
        };
    }));

    res.json(movements);
  } catch (error) {
    console.error('Failed to fetch inventory movements:', error);
    res.status(500).json({ error: 'Failed to fetch inventory movements' });
  }
});

// Update stock
router.post('/update-stock', async (req, res) => {
  const { product_id, movement_type, quantity, reason } = req.body;
  const productRef = db.collection('products').doc(product_id);

  try {
    const movementResult = await db.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists) {
        throw new Error('Product not found');
      }

      const { current_stock, min_stock_level, name } = productDoc.data();
      let new_stock;

      if (movement_type === 'IN') {
        new_stock = current_stock + quantity;
      } else if (movement_type === 'OUT') {
        new_stock = current_stock - quantity;
        if (new_stock < 0) {
          throw new Error('Insufficient stock');
        }
      } else {
        throw new Error('Invalid movement type');
      }

      transaction.update(productRef, { 
        current_stock: new_stock,
        updated_at: new Date().toISOString()
      });

      const movementRef = db.collection('inventory_movements').doc();
      const movementData = {
        product_id,
        movement_type,
        quantity,
        previous_stock: current_stock,
        new_stock,
        reason,
        user_id: req.user.uid,
        created_at: new Date().toISOString(),
      };
      transaction.set(movementRef, movementData);

      // Check for low stock alert
      if (new_stock <= min_stock_level) {
        await createAlert({
          product_id,
          alert_type: 'LOW_STOCK',
          message: `${name} is running low (${new_stock} units remaining)`
        });
      }

      return { id: movementRef.id, ...movementData };
    });

    res.json({
      movement: movementResult,
      new_stock: movementResult.new_stock
    });

  } catch (error) {
    console.error('Stock update failed:', error);
    if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Insufficient stock' || error.message === 'Invalid movement type') {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

export default router;