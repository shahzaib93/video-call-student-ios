// Firebase configuration for tarteel-quran project
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase config for tarteel-quran project
const firebaseConfig = {
  apiKey: "AIzaSyDrXbi2vqMua2jwvoEOsdEccUEGZAonIS4",
  authDomain: "tarteel-quran.firebaseapp.com",
  projectId: "tarteel-quran",
  storageBucket: "tarteel-quran.firebasestorage.app",
  messagingSenderId: "51402909238",
  appId: "1:51402909238:web:c4160931526c345c7a9a97",
  measurementId: "G-RDWBDV3HJ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with experimental long polling for iOS
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Use HTTP long polling instead of WebSocket
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

export const auth = getAuth(app);

// For development, you might want to use emulators
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Only connect to emulators in development and in browser environment
  try {
    // Uncomment these if you're using Firebase emulators locally
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
  }
}

export default app;