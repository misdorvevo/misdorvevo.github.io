// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmzRJQ8upEDxj0ttTt4xrS-eQz3lHrjGo",
  authDomain: "audiocave-f02ca.firebaseapp.com",
  projectId: "audiocave-f02ca",
  storageBucket: "audiocave-f02ca.firebasestorage.app",
  messagingSenderId: "767236463186",
  appId: "1:767236463186:web:847be305f5103a2ca95d8b",
  measurementId: "G-CLP4BNLSWN"
};

// Initialize Firebase - check if already initialized to prevent duplicate app error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);