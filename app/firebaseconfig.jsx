// app/lib/firebaseconfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
    getFirestore, 
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
    getDoc 
} from "firebase/firestore";
import { 
    getAuth, 
    setPersistence, 
    browserSessionPersistence, 
    signInWithEmailAndPassword, 
    updatePassword 
} from "firebase/auth";
import { getStorage } from "firebase/storage";

// Validate environment variables
const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(`Missing Firebase environment variables: ${missingEnvVars.join(', ')}`);
}

// Firebase config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore, Auth, and Storage
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable session persistence
setPersistence(auth, browserSessionPersistence).catch(error => {
    console.error('Failed to set auth persistence:', error);
});

// Export Firebase modules
export { 
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
    getDoc 
};