"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";

interface Movie {
  imdbID: string;
  Title: string;
  Poster: string;
  Year: string;
  Genre?: string;
  Plot?: string;
  Actors?: string;
}

export default function MyListPage() {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<Movie[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);
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
          setWatchedMovies(data.watchedMovies || []);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const markAsWatched = async (movie: Movie) => {
    if (!userId) return;
    try {
      const userDoc = doc(db, "watchlists", userId);
      await updateDoc(userDoc, {
        movies: arrayRemove(movie),
        watchedMovies: arrayUnion(movie),
      });
      setWatchlist((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
      setWatchedMovies((prev) => [...prev, movie]);
      setToast(`${movie.Title} marked as watched!`);
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Failed to update list:", err);
    }
  };

  const removeFromList = async (movie: Movie) => {
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

  const removeFromWatched = async (movie: Movie) => {
    if (!userId) return;
    try {
      const userDoc = doc(db, "watchlists", userId);
      await updateDoc(userDoc, {
        watchedMovies: arrayRemove(movie),
      });
      setWatchedMovies((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
      setToast(`${movie.Title} removed from watched list.`);
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Failed to update list:", err);
    }
  };

  const MovieCard = ({ movie, isWatched = false }: { movie: Movie; isWatched?: boolean }) => (
    <div
      onClick={() => setModalMovie(movie)}
      className="cursor-pointer bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 text-white shadow-lg hover:bg-white/20 transition-all duration-300 hover:scale-105 flex-shrink-0 w-64"
    >
      <img
        src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
        alt={movie.Title}
        className="w-full h-80 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold mb-1 truncate">{movie.Title}</h3>
      <p className="text-white/60 text-sm mb-3">{movie.Year}</p>
      <div className="flex gap-2">
        {!isWatched ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAsWatched(movie);
              }}
              className="px-3 py-2 bg-blue-500/20 text-blue-300 border border-blue-300/50 rounded-full hover:bg-blue-500/30 transition text-sm flex-1"
            >
              Watched
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromList(movie);
              }}
              className="px-3 py-2 bg-purple-500/20 text-purple-300 border border-purple-300/50 rounded-full hover:bg-purple-500/30 transition text-sm flex-1"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFromWatched(movie);
            }}
            className="px-3 py-2 bg-purple-500/20 text-purple-300 border border-purple-300/50 rounded-full hover:bg-purple-500/30 transition text-sm w-full"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );

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
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-lg shadow-lg border border-white/30">
          {toast}
        </div>
      )}

      {/* Watchlist Section */}
      <div className="mb-12">
        <h1 className="text-white text-3xl font-bold mb-6 drop-shadow-xl">
          My Watchlist
        </h1>

        {watchlist.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <p className="text-white/70 text-lg">No movies in your watchlist.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {watchlist.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Watched Movies Section */}
      <div>
        <h2 className="text-white text-3xl font-bold mb-6 drop-shadow-xl">
          Watched Movies
        </h2>

        {watchedMovies.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <p className="text-white/70 text-lg">No watched movies yet.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {watchedMovies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} isWatched={true} />
              ))}
            </div>
          </div>
        )}
      </div>

      {modalMovie && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setModalMovie(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl max-w-xl w-full shadow-2xl text-white"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <img
                src={modalMovie.Poster !== "N/A" ? modalMovie.Poster : "/placeholder.png"}
                alt={modalMovie.Title}
                className="w-full md:w-48 h-auto rounded-lg"
              />
              <div>
                <h2 className="text-3xl font-bold mb-2">{modalMovie.Title}</h2>
                <p className="text-sm text-white/70 mb-1">Year: {modalMovie.Year}</p>
                <p className="text-sm text-white/70 mb-1">Genre: {modalMovie.Genre || "N/A"}</p>
                <p className="text-sm text-white/60 mb-3">Cast: {modalMovie.Actors || "Unknown"}</p>
                <p className="text-white/80 text-sm italic">
                  "{modalMovie.Plot || "No description available."}"
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalMovie(null)}
              className="mt-4 w-full py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        
        .scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}