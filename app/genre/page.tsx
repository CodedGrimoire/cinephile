"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const clearGenres = () => {
    setSelectedGenres([]);
    setMovies([]);
  };

  const fetchMoviesByGenre = async () => {
    if (selectedGenres.length === 0) return;
    setLoading(true);

    try {
      const queries = await Promise.all(
        selectedGenres.map((genre) =>
          axios.get(`${apikey}&s=${genre}`)
        )
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
        backgroundImage: `url('https://i.pinimg.com/originals/a6/66/c0/a666c011c80315ad3c3a49b8e7d2ba06.gif')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        fontFamily: "Times New Roman, serif",
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Loader */}
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
              box-sizing: border-box;
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
              box-sizing: border-box;
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

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="mb-6 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-full hover:bg-white/20 backdrop-blur-md transition-all"
        >
          ⬅ Back to Home
        </button>

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
              onClick={() => setModalMovie(movie)}
              className="cursor-pointer bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:scale-105 transition"
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
            </div>
          ))}
        </div>

        {movies.length === 0 && !loading && selectedGenres.length > 0 && (
          <p className="text-center text-white/70 mt-12 text-lg">
            No movies found for selected genres.
          </p>
        )}

        {modalMovie && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
            <div className="bg-white text-black max-w-md w-full rounded-xl p-6 relative">
              <button
                className="absolute top-2 right-2 text-black/60 hover:text-black"
                onClick={() => setModalMovie(null)}
              >
                ✖
              </button>
              <img
                src={modalMovie.Poster !== "N/A" ? modalMovie.Poster : "/placeholder.png"}
                alt={modalMovie.Title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              <h2 className="text-2xl font-bold mb-2">{modalMovie.Title}</h2>
              <p className="text-sm text-gray-700 mb-2">{modalMovie.Year} • {modalMovie.Genre}</p>
              <p className="text-sm text-yellow-600 mb-2">⭐ IMDb: {modalMovie.imdbRating}</p>
              <p className="text-sm text-gray-800 mb-2"><strong>Cast:</strong> {modalMovie.Actors}</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                <strong>Description:</strong> {modalMovie.Plot}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
