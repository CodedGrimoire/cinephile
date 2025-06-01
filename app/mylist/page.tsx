"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";

interface Movie {
  imdbID: string;
  Title: string;
  Poster: string;
  Year: string;
}

export default function MyListPage() {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = doc(db, "watchlists", user.uid);
        const snapshot = await getDoc(userDoc);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setWatchlist(data.movies || []);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async (movie: Movie) => {
    if (!userId) return;
    try {
      const userDoc = doc(db, "watchlists", userId);
      await updateDoc(userDoc, {
        movies: arrayRemove(movie),
      });
      setWatchlist((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
      setToast(`${movie.Title} removed from your list.`);
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Failed to update list:", err);
    }
  };

  const loadMore = () => setVisibleCount((prev) => prev + 6);

  return (
    <div
      className="min-h-screen w-full px-6 py-8 relative"
      style={{
        backgroundImage:
          "url('https://cdn.dribbble.com/userupload/21386027/file/original-6c3c1d06479b15e1dd57492adebb0bd6.gif')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-white text-3xl font-bold mb-6 drop-shadow-xl text-center">
        My Watchlist
      </h1>

      {watchlist.length === 0 ? (
        <p className="text-white text-center">No movies in your list.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.slice(0, visibleCount).map((movie) => (
            <div
              key={movie.imdbID}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-white shadow-lg"
            >
              <img
                src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                alt={movie.Title}
                className="w-full h-64 object-cover rounded-md mb-4"
              />
              <h3 className="text-xl font-semibold mb-1">{movie.Title}</h3>
              <p className="text-white/60 text-sm mb-2">{movie.Year}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(movie)}
                  className="px-4 py-2 bg-green-500/20 text-green-300 border border-green-300 rounded-full hover:bg-green-500/30 transition"
                >
                  Watched
                </button>
                <button
                  onClick={() => handleAction(movie)}
                  className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-300 rounded-full hover:bg-red-500/30 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleCount < watchlist.length && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-white/20 text-white rounded-full hover:bg-white/30"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}