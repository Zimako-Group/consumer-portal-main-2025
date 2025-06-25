// Import the functions you need from the SDKs
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, setAnalyticsCollectionEnabled, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, ref, type FirebaseStorage, type StorageReference } from 'firebase/storage';

// Validate environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required Firebase environment variables:', missingVars);
  console.error('Please check your .env file and ensure all Firebase variables are set.');
  console.error('Required variables:', requiredEnvVars);
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || ''
};

// Log configuration status (without exposing sensitive data)
console.log('Firebase configuration status:', {
  apiKeySet: !!firebaseConfig.apiKey,
  authDomainSet: !!firebaseConfig.authDomain,
  projectIdSet: !!firebaseConfig.projectId,
  storageBucketSet: !!firebaseConfig.storageBucket,
  messagingSenderIdSet: !!firebaseConfig.messagingSenderId,
  appIdSet: !!firebaseConfig.appId,
  measurementIdSet: !!firebaseConfig.measurementId,
  databaseURLSet: !!firebaseConfig.databaseURL
});

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let realtimeDb: Database | null = null;
let storage: FirebaseStorage | null = null;
let storageRef: StorageReference | null = null;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');

  // Initialize Analytics (with error handling)
  try {
    analytics = getAnalytics(app);
    
    // Disable analytics in development or if cookies are being rejected
    const isProduction = import.meta.env.PROD;
    if (!isProduction) {
      setAnalyticsCollectionEnabled(analytics, false);
    }
  } catch (analyticsError) {
    console.warn('Analytics initialization failed:', analyticsError);
    analytics = null;
  }

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  realtimeDb = getDatabase(app);
  storage = getStorage(app);
  storageRef = ref(storage);
  
  console.log('All Firebase services initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.error('Please check your Firebase configuration and environment variables');
  
  // Create mock objects to prevent app crashes
  auth = null;
  db = null;
  realtimeDb = null;
  storage = null;
  storageRef = null;
  analytics = null;
}

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

// Create a function to get headers for storage operations
const getCustomHeaders = async () => ({
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

// Default storage configuration values
// These can be used when configuring storage operations
const storageConfig = {
  maxOperationRetryTime: 120000, // 2 minutes
  maxUploadRetryTime: 120000, // 2 minutes
  corsConfig
};

export { 
  analytics, 
  auth, 
  db, 
  realtimeDb, 
  storage,
  storageRef,
  app,
  getCustomHeaders,
  storageConfig
};