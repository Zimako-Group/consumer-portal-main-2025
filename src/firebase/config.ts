import { getFirestore, type Firestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';

// Import the existing Firebase app instance from the main config file
import { app as firebaseApp } from '../firebaseConfig';

// Use the imported app with proper typing
const app: FirebaseApp | null = firebaseApp;

// Initialize Firestore using the existing app instance
export const db: Firestore | null = app ? getFirestore(app) : null;

// Export the existing app instance
export default app;
