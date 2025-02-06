import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
    apiKey: "AIzaSyAhW7-IqcrXlXGdjyZV8wrTljCFZCi2YxM",
    authDomain: "cimema-ticket.firebaseapp.com",
    projectId: "cimema-ticket",
    storageBucket: "cimema-ticket.firebasestorage.app",
    messagingSenderId: "477107000918",
    appId: "1:477107000918:web:a80697a2bb034bf508cdf7",
    measurementId: "G-QVCCSFG6K7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const storage = getStorage(app);
// Enable session persistence
setPersistence(auth, browserSessionPersistence);
export { collection, addDoc, getDocs, query, where ,storage};
