// app/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/firebaseConfig";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage:
          "url('https://media.tenor.com/EtE11qgEtLIAAAAM/art-starry-night.gif')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="backdrop-blur-lg bg-white/10 border border-white/30 shadow-2xl rounded-2xl p-8 w-full max-w-md text-white text-center">
        {user ? (
          <>
            <img
              src={user.photoURL || "/globe.svg"}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white mb-4"
            />
            <h1 className="text-2xl font-bold mb-2">{user.displayName || "No Name"}</h1>
            <p className="text-white/80 text-sm">{user.email}</p>
            <p className="text-white/50 text-xs mt-2">UID: {user.uid}</p>
          </>
        ) : (
          <p className="text-white">Loading...</p>
        )}
      </div>
    </div>
  );
}
