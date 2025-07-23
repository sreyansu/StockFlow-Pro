import { auth, db } from '../config/firebase.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const idToken = authHeader && authHeader.split(' ')[1];

  if (!idToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
        return res.status(401).json({ error: 'User not found in database' });
    }

    req.user = { uid: decodedToken.uid, ...userDoc.data() };
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};