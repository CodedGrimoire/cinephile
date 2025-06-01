import { initializeApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as analyticsIsSupported,
} from "firebase/analytics";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqM5jVtgVb2yX2mC4zDlfuhpKfOzY-mnU",
  authDomain: "cinephile-e1055.firebaseapp.com",
  projectId: "cinephile-e1055",
  storageBucket: "cinephile-e1055.firebasestorage.app",
  messagingSenderId: "1055645990910",
  appId: "1:1055645990910:web:c15e451c38aecf34548aaf",
  measurementId: "G-2DCEZTQ3T0",
};

// ✅ Initialize only once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Initialize analytics only if supported and on client
if (typeof window !== "undefined") {
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
