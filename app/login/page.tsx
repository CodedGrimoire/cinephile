"use client";

import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ✅ Save to Firestore if new
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: new Date(),
        });
        console.log("✅ User added to Firestore");
      } else {
        console.log("ℹ️ User already exists in Firestore");
      }

      // ✅ Save locally
      localStorage.setItem("user", JSON.stringify({
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
      }));

      console.log("✅ Login successful");
      router.push("/homepage");

    } catch (error) {
      console.error("❌ Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
      <h1 className="text-4xl font-bold mb-8">Login to Cinephile</h1>
      <button
        onClick={signInWithGoogle}
        className="bg-white text-black px-6 py-3 rounded-full hover:scale-105 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
}
