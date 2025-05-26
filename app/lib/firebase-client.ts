import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getFirestore, Firestore, collection, query, orderBy, where, getDocs, doc, updateDoc, addDoc, onSnapshot, Timestamp, deleteDoc, writeBatch, serverTimestamp, limit, getDoc } from 'firebase/firestore';
import { getAuth, Auth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app only if it hasn't been initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
let analytics: Analytics | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: any;

if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    setPersistence(auth, browserSessionPersistence);
  } catch (error) {
    console.warn('Client-side Firebase initialization failed:', error);
  }
}

// Export Firebase services and utilities
export {
  app,
  analytics,
  auth,
  db,
  storage,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  limit,
  writeBatch,
  getDoc,
  signInWithEmailAndPassword,
  updatePassword,
  Timestamp,
};