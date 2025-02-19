import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const createSuperAdmin = async () => {
  try {
    // Create the user in Firebase Authentication with compliant password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'test@zimako.co.za',
      '832287767@Tj'
    );

    // Add the user data to Firestore with superadmin role
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: 'test@zimako.co.za',
      fullName: 'Super Admin',
      role: 'superadmin',
      createdAt: new Date().toISOString()
    });

    console.log('SuperAdmin user created successfully');
    return userCredential;
  } catch (error) {
    console.error('Error creating SuperAdmin:', error);
    throw error;
  }
};