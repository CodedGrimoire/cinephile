import { initializeApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as analyticsIsSupported,
} from "firebase/analytics";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqM5jVtgVb2yX2mC4zDlfuhpKfOzY-mnU",
  authDomain: "cinephile-e1055.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ? "demo-cinephile" : "cinephile-e1055",
  storageBucket: "cinephile-e1055.firebasestorage.app",
  messagingSenderId: "1055645990910",
  appId: "1:1055645990910:web:c15e451c38aecf34548aaf",
  measurementId: "G-2DCEZTQ3T0",
};

// ✅ Initialize only once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Local-only opt-in. Production defaults continue to use the configured project.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// ✅ Initialize analytics only if supported and on client
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== "true") {
  analyticsIsSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

// ✅ Set persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to set auth persistence:", error);
});

// ✅ Export correctly
export { app, auth, db };
