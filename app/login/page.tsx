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
          displayName: user.displayName,
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
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      {/* Animated Film Strip Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-0 top-0 w-16 h-full bg-gradient-to-r from-gray-800 to-gray-900 flex flex-col">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="h-8 border-b-2 border-gray-700 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-600"></div>
            </div>
          ))}
        </div>
        <div className="absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-gray-800 to-gray-900 flex flex-col">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="h-8 border-b-2 border-gray-700 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-600"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Film Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-8 h-8 border-2 border-gray-600 rounded-full animate-pulse opacity-20"></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 border-2 border-gray-500 rounded-full animate-pulse opacity-30 animation-delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/3 w-4 h-4 border-2 border-gray-700 rounded-full animate-pulse opacity-25 animation-delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-10 h-10 border-2 border-gray-400 rounded-full animate-pulse opacity-15 animation-delay-3000"></div>
      </div>

      {/* Spotlight Effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/60"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo/Title Section */}
        <div className="text-center mb-12 transform hover:scale-105 transition-transform duration-300">
          {/* Camera Icon */}
          <div className="mx-auto mb-6 relative">
            <div className="w-20 h-16 bg-white border-4 border-gray-300 relative mx-auto rounded-lg shadow-2xl">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white border-2 border-gray-300 rounded-t-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-4 border-black rounded-full">
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-black rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full opacity-30"></div>
                </div>
              </div>
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-gray-300 rounded-r"></div>
            </div>
          </div>

          {/* Title with Cinematic Typography */}
          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-b from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            CINEPHILE
          </h1>
          <div className="flex items-center justify-center space-x-4 mb-2">
            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent to-white"></div>
            <p className="text-gray-300 text-lg font-light tracking-widest">
              YOUR MOVIE UNIVERSE
            </p>
            <div className="h-0.5 w-16 bg-gradient-to-l from-transparent to-white"></div>
          </div>
          <p className="text-gray-500 text-sm">
            Where every frame tells a story
          </p>
        </div>

        {/* Login Section */}
        <div className="w-full max-w-md">
          <div className="backdrop-blur-sm bg-white/5 border border-gray-800 rounded-2xl p-8 shadow-2xl hover:shadow-white/10 transition-all duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">Welcome Back</h2>
              <p className="text-gray-400">Continue your cinematic journey</p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={signInWithGoogle}
              className="w-full group relative overflow-hidden bg-white hover:bg-gray-100 text-black font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl"
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </div>
              
              {/* Animated border effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full group-hover:translate-x-0 transition-transform duration-1000"></div>
            </button>
          </div>
        </div>

        {/* Bottom Decorative Elements */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse animation-delay-500"></div>
          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse animation-delay-1000"></div>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}