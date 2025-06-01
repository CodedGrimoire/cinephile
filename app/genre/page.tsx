"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { db, auth } from "@/firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const allGenres = [
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History",
  "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi", "Sport",
  "Thriller", "War", "Western", "Reality-TV", "Short", "Talk-Show", "Game-Show",
  "Superhero", "Detective", "Classic", "Survival", "Cyberpunk", "Psychological",
];

interface Movie {
  Title: string;
  Year: string;
  imdbID: string;
  Poster: string;
  Genre?: string;
  imdbRating?: string;
  Plot?: string;
  Actors?: string;
}

export default function GenrePage() {
  const router = useRouter();
  const apikey = "https://www.omdbapi.com/?apikey=a4d5b9";

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const clearGenres = () => {
    setSelectedGenres([]);
    setMovies([]);
  };

  const addToList = async (movie: Movie) => {
    if (!userId) return;
    const userDoc = doc(db, "watchlists", userId);

    try {
      const snapshot = await getDoc(userDoc);
      if (!snapshot.exists()) {
        await setDoc(userDoc, { movies: [movie] });
      } else {
        await updateDoc(userDoc, {
          movies: arrayUnion(movie),
        });
      }
      setAddedMessage(`${movie.Title} has been added to your list.`);
      setTimeout(() => setAddedMessage(null), 2500);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const fetchMoviesByGenre = async () => {
    if (selectedGenres.length === 0) return;
    setLoading(true);

    try {
      const queries = await Promise.all(
        selectedGenres.map((genre) => axios.get(`${apikey}&s=${genre}`))
      );

      const results = (
        await Promise.all(
          queries
            .map((res) => (res.data as { Search?: any[] }).Search || [])
            .flat()
            .map(async (movie: any) => {
              const { data } = await axios.get(`${apikey}&i=${movie.imdbID}`);
              return data;
            })
        )
      ).filter((m) =>
        selectedGenres.some((g) =>
          (m as Movie).Genre?.toLowerCase().includes(g.toLowerCase())
        )
      );

      setMovies(results as Movie[]);
    } catch (err) {
      console.error("Failed to fetch genre movies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoviesByGenre();
  }, [selectedGenres]);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden text-white"
      style={{
        backgroundImage: `url('https://media.tenor.com/bZEUn3ywcQQAAAAM/stormcastle-count-down.gif')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        fontFamily: "Times New Roman, serif",
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <span className="loader"></span>
          <style>{`
            .loader {
              position: relative;
              width: 100px;
              height: 100px;
              border: 24px solid #FFF;
              border-radius: 50%;
              animation: eat 1s linear infinite;
            }
            .loader::after, .loader::before {
              content: '';
              position: absolute;
              left: 50px;
              top: 50%;
              transform: translateY(-50%);
              background: #fff;
              width: 15px;
              height: 15px;
              border-radius: 50%;
              opacity: 0;
              animation: move 2s linear infinite;
            }
            .loader::before {
              animation-delay: 1s;
            }
            @keyframes eat {
              0%, 49% { border-right-color: #FFF; }
              50%, 100% { border-right-color: transparent; }
            }
            @keyframes move {
              0% { left: 75px; opacity: 1; }
              50% { left: 0px; opacity: 1; }
              52%, 100% { left: -5px; opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {addedMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-2 rounded-lg shadow-lg">
          {addedMessage}
        </div>
      )}

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-[0_0_10px_white]">
          Genre Based Filtering
        </h1>
        <p className="text-white/80 mb-6">
          Click genres below to find movies that match your interests.
        </p>

        <div className="flex flex-wrap gap-2 mb-6 max-w-5xl">
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${
                selectedGenres.includes(genre)
                  ? "bg-white text-black border-white"
                  : "bg-white/10 text-white border-white/30 hover:bg-white/20"
              } transition`}
            >
              {genre}
            </button>
          ))}
          <button
            onClick={clearGenres}
            className="text-xs px-3 py-1 rounded-full bg-red-600/70 hover:bg-red-700 transition text-white"
          >
            ❌ Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <div
              key={movie.imdbID}
              className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:scale-105 transition"
            >
              <img
                src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                alt={movie.Title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-1">{movie.Title}</h3>
              <p className="text-white/70">{movie.Year}</p>
              <p className="text-yellow-300 text-sm">⭐ {movie.imdbRating}</p>
              <p className="text-white/60 text-xs mt-1">{movie.Genre}</p>
              <button
                onClick={() => addToList(movie)}
                className="mt-2 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-full text-white"
              >
                ➕ Add to List
              </button>
            </div>
          ))}
        </div>

        {movies.length === 0 && !loading && selectedGenres.length > 0 && (
          <p className="text-center text-white/70 mt-12 text-lg">
            No movies found for selected genres.
          </p>
        )}
      </div>
    </div>
  );
}
