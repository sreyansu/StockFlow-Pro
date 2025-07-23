import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import serviceAccount from '../config/firebase-service-account.json' assert { type: 'json' };

dotenv.config({ path: '../../.env' });

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL;
const MASTER_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD;

if (!MASTER_ADMIN_EMAIL || !MASTER_ADMIN_PASSWORD) {
  console.error('Error: MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD must be set in your .env file.');
  process.exit(1);
}

async function createMasterAdmin() {
  console.log(`Checking for master admin with email: ${MASTER_ADMIN_EMAIL}...`);

  try {
    let userRecord;
    try {
      // Check if user already exists
      userRecord = await auth.getUserByEmail(MASTER_ADMIN_EMAIL);
      console.log('Master admin user already exists. UID:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User does not exist, create them
        console.log('Master admin user not found. Creating new user...');
        userRecord = await auth.createUser({
          email: MASTER_ADMIN_EMAIL,
          password: MASTER_ADMIN_PASSWORD,
          emailVerified: true,
          displayName: 'Master Admin',
        });
        console.log('Successfully created new master admin user. UID:', userRecord.uid);
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Set user role in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      name: 'Master Admin',
      email: MASTER_ADMIN_EMAIL,
      role: 'master_admin',
      status: 'active',
      created_at: new Date().toISOString(),
    }, { merge: true });

    console.log(`Successfully set role 'master_admin' for user ${MASTER_ADMIN_EMAIL} in Firestore.`);
    console.log('Master admin setup complete.');

  } catch (error) {
    console.error('Error during master admin setup:', error);
    process.exit(1);
  }
}

createMasterAdmin();
