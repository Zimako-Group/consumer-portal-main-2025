const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Load environment variables from .env file
require('dotenv').config();

// Your Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Super admin details from environment variables
const newSuperAdmin = {
  email: process.env.SUPER_ADMIN_EMAIL,
  password: process.env.SUPER_ADMIN_PASSWORD,
  fullName: process.env.SUPER_ADMIN_FULL_NAME
};

// Validate that required environment variables are set
if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD || !process.env.SUPER_ADMIN_FULL_NAME) {
  console.error('Error: Required environment variables are missing. Please set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_FULL_NAME.');
  process.exit(1);
}

// Password validation
function validatePassword(password) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    throw new Error('Password must contain at least one special character (!@#$%^&*)');
  }
}

async function createSuperAdmin({ email, password, fullName }) {
  try {
    // Validate password
    validatePassword(password);

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Add user data to Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      fullName,
      role: 'superadmin',
      createdAt: new Date().toISOString(),
      hasChangedPassword: true,
      active: true,
      lastLogin: new Date().toISOString()
    });

    console.log('Super admin created successfully!');
    console.log('Email:', email);
    console.log('Full Name:', fullName);
    console.log('Role: superadmin');
    return userCredential;
  } catch (error) {
    console.error('Error creating super admin:', error.message);
    throw error;
  }
}

// Create the super admin
createSuperAdmin(newSuperAdmin)
  .then(() => {
    console.log('Process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create super admin:', error.message);
    process.exit(1);
  });
