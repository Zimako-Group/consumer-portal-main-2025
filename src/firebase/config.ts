import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNKCwKFcpSWKwTmYEcVvF0CXxGLxkwy5I",
  authDomain: "consumer-portal-b6fce.firebaseapp.com",
  projectId: "consumer-portal-b6fce",
  storageBucket: "consumer-portal-b6fce.appspot.com",
  messagingSenderId: "1050426550867",
  appId: "1:1050426550867:web:b2c3cc1d3c2d9e4b4e3a2f"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

export default app;
