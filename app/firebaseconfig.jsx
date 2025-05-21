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
    getDoc // Add getDoc here
} from "firebase/firestore";
import { 
    getAuth, 
    setPersistence, 
    browserSessionPersistence, 
    signInWithEmailAndPassword, 
    updatePassword 
} from "firebase/auth";
import { getStorage } from "firebase/storage";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Set Firestore log level to silent to suppress connectivity errors
setLogLevel("silent");

// Initialize Firestore with memory cache and enable offline persistence
const db = initializeFirestore(app, {
    cache: memoryLocalCache(),
    experimentalForceOwningTab: true
});

// Initialize Auth and Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable session persistence
setPersistence(auth, browserSessionPersistence);

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
    getDoc // Add getDoc here
};