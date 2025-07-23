import express from 'express';
import { auth, db } from '../config/firebase.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'admin' } = req.body;

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      status: 'approved', // Or 'pending' for manual approval
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      uid: userRecord.uid 
    });

  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Registration failed', detail: error.message });
  }
});


export default router;