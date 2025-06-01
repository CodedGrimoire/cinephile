// components/MovieCard.tsx
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

interface MovieCardProps {
  movie: Movie;
  onMovieClick: (movie: Movie) => void;
  onAddToList: (movie: Movie) => void;
  showAddButton?: boolean;
}

export default function MovieCard({ 
  movie, 
  onMovieClick, 
  onAddToList, 
  showAddButton = false 
}: MovieCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition">
      <div onClick={() => onMovieClick(movie)} className="cursor-pointer">
        <img
          src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
          alt={movie.Title}
          className="w-full h-64 object-cover rounded-lg mb-4"
        />
        <h3 className="text-xl font-semibold mb-2">{movie.Title}</h3>
        <p className="text-white/70 mb-1">{movie.Year}</p>
        {movie.imdbRating && (
          <p className="text-yellow-300 text-sm mb-1">⭐ IMDb: {movie.imdbRating}</p>
        )}
        {movie.Actors && (
          <p className="text-white/60 text-sm">
            Cast: {movie.Actors.split(",").slice(0, 3).join(", ")}
          </p>
        )}
      </div>

      {showAddButton && (
        <button
          onClick={() => onAddToList(movie)}
          className="mt-3 px-4 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-full text-white"
        >
          ➕ Add to List
        </button>
      )}
    </div>
  );
}