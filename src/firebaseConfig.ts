// Import the functions you need from the SDKs
import { initializeApp } from 'firebase/app';
import { getAnalytics, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage, ref } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Disable analytics in development or if cookies are being rejected
const isProduction = import.meta.env.PROD;
if (!isProduction) {
  setAnalyticsCollectionEnabled(analytics, false);
}

const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app); // Initialize Realtime Database
const storage = getStorage(app);

// Configure Storage with CORS
const storageInstance = getStorage(app);
const storageRef = ref(storageInstance);

// Enhanced CORS configuration
const corsConfig = {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Cache-Control',
    'Content-Length'
  ],
  maxAge: 3600,
  credentials: true
};

// Apply enhanced CORS configuration to storage
storage.customDomain = `https://${firebaseConfig.storageBucket}`;
storage.setCustomHeaders = async () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': corsConfig.methods.join(', '),
  'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
  'Access-Control-Max-Age': corsConfig.maxAge.toString(),
  'Access-Control-Allow-Credentials': 'true',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

// Configure default storage settings
storageInstance.maxOperationRetryTime = 120000; // 2 minutes
storageInstance.maxUploadRetryTime = 120000; // 2 minutes

export { 
  analytics, 
  auth, 
  db, 
  realtimeDb, 
  storage,
  storageRef,
  app 
};