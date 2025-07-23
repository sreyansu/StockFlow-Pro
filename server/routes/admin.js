import express from 'express';
import { db, auth } from '../config/firebase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const listUsersResult = await auth.listUsers();
    const users = await Promise.all(
      listUsersResult.users.map(async (userRecord) => {
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        return {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userData.name || 'N/A',
          role: userData.role || 'staff',
          status: userRecord.disabled ? 'disabled' : 'active',
          created_at: userRecord.metadata.creationTime,
        };
      })
    );
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
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

    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing the master admin's role
    if (userDoc.data().role === 'master_admin') {
      return res.status(403).json({ error: 'Cannot change the role of the master admin.' });
    }

    await userRef.update({ role });
    res.json({ uid: id, role });
  } catch (error) {
    console.error('Failed to update user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update user status (admin only)
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled } = req.body;

    await auth.updateUser(id, { disabled });

    res.json({ uid: id, status: disabled ? 'disabled' : 'active' });
  } catch (error) {
    console.error('Failed to update user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});


// Delete a user (admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Add a check to prevent deleting the master admin
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists && userDoc.data().role === 'master_admin') {
      return res.status(403).json({ error: 'Cannot delete the master admin.' });
    }

    await auth.deleteUser(id);
    await db.collection('users').doc(id).delete();
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
