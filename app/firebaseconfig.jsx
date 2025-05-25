import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  setLogLevel,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  Timestamp,
  updateDoc,
  deleteDoc,
  limit,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase config using server-side environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw new Error("Failed to initialize Firebase");
}

// Set Firestore log level to silent to suppress connectivity errors
setLogLevel("silent");

// Initialize Firestore with memory cache
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceOwningTab: true,
});

// Initialize Auth and Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable session persistence with error handling
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

// Export necessary Firebase modules
export {
  db,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  updatePassword,
  signInWithEmailAndPassword,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  limit,
  writeBatch,
  getDoc,
};