const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwb5v9FrGaEaRG86pHjxtPLwrKn1llB3s",
  authDomain: "zimako-backend.firebaseapp.com",
  projectId: "zimako-backend",
  storageBucket: "zimako-backend.firebasestorage.app",
  messagingSenderId: "833787391563",
  appId: "1:833787391563:web:ff4cb0f78d73ba15c667ce",
  measurementId: "G-YB7X3FBZE8",
  databaseURL: "https://zimako-backend-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Super admin details - replace these values
const newSuperAdmin = {
  email: "tshepangsa@zimako.co.za",
  password: "832287767@Tj",
  fullName: "Tshepang Sambo"
};

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
