// components/UserDropdown.tsx
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/firebaseConfig";

interface UserDropdownProps {
  photoURL: string | null;
}

export default function UserDropdown({ photoURL }: UserDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    const auth = getAuth(app);
    signOut(auth);
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-10 h-10 rounded-full border border-white/40 overflow-hidden hover:scale-105 transition"
        >
          <img
            src={photoURL || "/globe.svg"}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-black/90 text-white border border-white/20 rounded-lg shadow-xl">
            <button
              onClick={() => router.push("/profile")}
              className="block w-full px-4 py-2 text-left hover:bg-white/10"
            >
              My Profile
            </button>
            <button
              onClick={() => router.push("/mylist")}
              className="block w-full px-4 py-2 text-left hover:bg-white/10"
            >
              My List
            </button>
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left hover:bg-white/10 border-t border-white/20"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}