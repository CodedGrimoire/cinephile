// components/MovieModal.tsx
import React from "react";

interface Movie {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
  imdbRating?: string;
  Actors?: string;
  Genre?: string;
  Plot?: string;
  [key: string]: string | number | boolean | undefined;
}

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export default function MovieModal({ movie, onClose }: MovieModalProps) {
  if (!movie) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#1e1e2f] to-[#0f0f1a] p-6 rounded-2xl border border-white/20 max-w-xl w-full shadow-2xl text-white"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <img
            src={
              movie.Poster !== "N/A"
                ? movie.Poster
                : "/placeholder.png"
            }
            alt={movie.Title}
            className="w-full md:w-48 h-auto rounded-lg"
          />
          <div>
            <h2 className="text-3xl font-bold mb-2">{movie.Title}</h2>
            <p className="text-sm text-white/70 mb-1">
              Year: {movie.Year}
            </p>
            <p className="text-sm text-white/70 mb-1">
              Genre: {movie.Genre}
            </p>
            <p className="text-sm text-yellow-300 mb-1">
              ⭐ IMDb: {movie.imdbRating}
            </p>
            <p className="text-sm text-white/60 mb-3">
              Cast: {movie.Actors}
            </p>
            {movie.Plot && (
              <p className="text-white/80 text-sm italic">
                {"\"" + movie.Plot + "\""}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}