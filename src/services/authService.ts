import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { trackUserActivity } from '../utils/activityTracker';

interface UserData {
  email: string;
  fullName: string;
  accountNumber: string;
  role: 'user' | 'admin' | 'superadmin';
}

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  accountNumber: string
): Promise<UserCredential> => {
  try {
    // Create authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Store additional user data in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      fullName,
      accountNumber,
      role: 'user', // Default role for new users
      createdAt: new Date().toISOString()
    });

    // Track signup activity
    await trackUserActivity(
      userCredential.user.uid,
      'signup',
      'AuthService',
      {
        email,
        accountNumber,
        timestamp: new Date().toISOString()
      }
    );

    return userCredential;
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string): Promise<UserData> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data() as UserData;

    // Track login activity
    await trackUserActivity(
      userCredential.user.uid,
      'login',
      'AuthService',
      {
        email,
        role: userData.role,
        timestamp: new Date().toISOString()
      }
    );

    return userData;
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Track logout activity before signing out
      await trackUserActivity(
        user.uid,
        'logout',
        'AuthService',
        {
          timestamp: new Date().toISOString()
        }
      );
    }
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return null;
    }
    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};