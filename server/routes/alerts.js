import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// Get alerts
router.get('/', async (req, res) => {
  try {
    const { unread_only } = req.query;
    let query = db.collection('alerts');

    if (unread_only === 'true') {
      query = query.where('is_read', '==', false);
    }

    const snapshot = await query.orderBy('created_at', 'desc').get();

    const alerts = await Promise.all(snapshot.docs.map(async (doc) => {
      const alert = { id: doc.id, ...doc.data() };
      if (alert.product_id) {
        const productDoc = await db.collection('products').doc(alert.product_id).get();
        if (productDoc.exists) {
          alert.product_name = productDoc.data().name;
          alert.sku = productDoc.data().sku;
        }
      }
      return alert;
    }));

    res.json(alerts);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Mark alert as read
router.put('/:id/read', async (req, res) => {
  try {
    const alertRef = db.collection('alerts').doc(req.params.id);
    const doc = await alertRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alertRef.update({
      is_read: true,
      read_at: new Date().toISOString(),
    });

    res.json({ id: doc.id, ...doc.data(), is_read: true });
  } catch (error) {
    console.error('Failed to mark alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// Mark all alerts as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const snapshot = await db.collection('alerts').where('is_read', '==', false).get();
    
    if (snapshot.empty) {
      return res.json({ message: 'No unread alerts to mark as read.' });
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { 
        is_read: true,
        read_at: new Date().toISOString()
      });
    });

    await batch.commit();
    res.json({ message: 'All unread alerts marked as read' });
  } catch (error) {
    console.error('Failed to mark all alerts as read:', error);
    res.status(500).json({ error: 'Failed to mark all alerts as read' });
  }
});

export default router;