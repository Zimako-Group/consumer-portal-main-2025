import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

interface SuperAdminData {
  email: string;
  password: string;
  fullName: string;
}

export const createSuperAdmin = async ({ email, password, fullName }: SuperAdminData) => {
  try {
    // Validate password strength
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

    // Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Add the user data to Firestore with superadmin role
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      fullName,
      role: 'superadmin',
      createdAt: new Date().toISOString(),
      hasChangedPassword: true, // So they don't get prompted to change password on first login
      active: true,
      lastLogin: new Date().toISOString()
    });

    console.log('SuperAdmin user created successfully');
    return userCredential;
  } catch (error) {
    console.error('Error creating SuperAdmin:', error);
    throw error;
  }
};