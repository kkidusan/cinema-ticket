import { initializeApp } from "firebase/app";
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
    updateDoc 
} from "firebase/firestore";

import { 
    getAuth, 
    setPersistence, 
    browserSessionPersistence, 
    signInWithEmailAndPassword, 
    updatePassword 
} from "firebase/auth";

import { getStorage } from 'firebase/storage';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAhW7-IqcrXlXGdjyZV8wrTljCFZCi2YxM",
    authDomain: "cimema-ticket.firebaseapp.com",
    projectId: "cimema-ticket",
    storageBucket: "cimema-ticket.firebasestorage.app",
    messagingSenderId: "477107000918",
    appId: "1:477107000918:web:a80697a2bb034bf508cdf7",
    measurementId: "G-QVCCSFG6K7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable session persistence
setPersistence(auth, browserSessionPersistence);

// Export necessary Firebase modules
export { 
    addDoc, 
    collection, 
    query, 
    where, 
    storage, 
    getDocs, 
    updateDoc, 
    doc, 
    updatePassword, 
    signInWithEmailAndPassword,  // ✅ Correctly Exported
    orderBy, 
    onSnapshot, 
    serverTimestamp 
};
