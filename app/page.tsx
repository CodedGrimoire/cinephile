"use client";
import React, { useState, useEffect } from "react";
import SearchBar from "./components/search";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Home() {
  const apikey = "https://www.omdbapi.com/?apikey=a4d5b9";
  const router = useRouter();

// Removed duplicate search function declaration to fix redeclaration error

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
    [key: string]: any;
  }

  interface OMDBResponse {
    Search?: Movie[];
    totalResults?: string;
    Response: string;
    Error?: string;
    [key: string]: any;
  }

  const [s, setS] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalMovie, setModalMovie] = useState<Movie | null>(null);

  const featuredMovieIDs = [
    "tt0133093", // The Matrix
    "tt1375666", // Inception
    "tt0109830", // Forrest Gump
    "tt0110912", // Pulp Fiction
    "tt0114709", // Toy Story
    "tt0468569", // The Dark Knight
    "tt0107048", // Groundhog Day
    "tt0078748", // Alien
  ];

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setS(e.target.value);
  };

  const fetchMovieDetails = async (movie: Movie | string): Promise<Movie> => {
    try {
      const id = typeof movie === "string" ? movie : movie.imdbID;
      const { data } = await axios.get(`${apikey}&i=${id}&plot=short`);
      const movieData = data as Movie;
      return {
        Title: movieData.Title,
        Year: movieData.Year,
        imdbID: movieData.imdbID,
        Type: movieData.Type,
        Poster: movieData.Poster,
        imdbRating: movieData.imdbRating,
        Actors: movieData.Actors,
        Genre: movieData.Genre,
        Plot: movieData.Plot,
      };
    } catch (err) {
      console.error("Error fetching movie details:", err);
      return typeof movie === "string"
        ? { Title: "", Year: "", imdbID: movie, Type: "", Poster: "" }
        : movie;
    }
  };

  const search = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      setLoading(true);
      axios
        .get<OMDBResponse>(`${apikey}&s=${s}`)
        .then(async (response) => {
          const searchResults = response.data.Search || [];
          const detailedResults = await Promise.all(
            searchResults.map((movie) => fetchMovieDetails(movie))
          );
          setResults(detailedResults);
          setLoading(false);
        })
        .catch((error: unknown) => {
          console.error("Error fetching data:", error);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      const movies = await Promise.all(
        featuredMovieIDs.map((id) => fetchMovieDetails(id))
      );
      setFeaturedMovies(movies);
    };
    fetchFeatured();
  }, []);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: `url('https://universesandbox.com/blog/wp-content/uploads/2022/05/Constellations-Feature-GIF.gif')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        fontFamily: "Times New Roman, serif",
      }}
    >
      <div className="absolute inset-0 bg-black/30"></div>

      {loading && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
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


      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-8 text-white">
        {/* Header & Search Section */}
        <div className="w-full max-w-7xl mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 px-4">
          {/* Left Side */}
          <div className="flex flex-row items-center gap-4">
            <img
              src="https://i.pinimg.com/originals/21/cd/b8/21cdb894dc262b1b668d20c64dd488cd.gif"
              alt="logo"
              className="w-24 h-24 rounded-full object-cover drop-shadow-[0_0_6px_white]"
            />
            <div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_10px_white]">
                MovieHub
              </h1>
              <p className="text-lg md:text-xl text-white/80 mt-2 drop-shadow-[0_0_6px_white]">
                Your go-to place for movie information
              </p>
            </div>
          </div>

          {/* Right Side: Search and Button */}
          <div className="flex flex-col items-center gap-4 w-full md:w-[400px]">
            <SearchBar handleInput={handleInput} search={search} />
            <button
              onClick={() => router.push("/genre")}
              className="w-full px-6 py-3 bg-white/20 text-white backdrop-blur-md rounded-full border border-white/30 hover:bg-white/30 transition-all duration-300 hover:scale-105"
            >
              Genre Based Filtering
            </button>
          </div>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="w-full max-w-7xl mx-auto mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((movie) => (
                <div
                  key={movie.imdbID}
                  onClick={() => setModalMovie(movie)}
                  className="cursor-pointer bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition"
                >
                  <img
                    src={
                      movie.Poster !== "N/A"
                        ? movie.Poster
                        : "/placeholder.png"
                    }
                    alt={movie.Title}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-semibold mb-2">{movie.Title}</h3>
                  <p className="text-white/70 mb-1">{movie.Year}</p>
                  {movie.imdbRating && (
                    <p className="text-yellow-300 text-sm mb-1">
                      ⭐ IMDb: {movie.imdbRating}
                    </p>
                  )}
                  {movie.Actors && (
                    <p className="text-white/60 text-sm">
                      Cast: {movie.Actors.split(",").slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Movies */}
        <div className="w-full max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 md:p-8 shadow-2xl">
            <h2 className="text-1xl md:text-3xl font-bold text-white mb-6 text-center drop-shadow-[0_0_6px_white]">
              Featured Movies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredMovies.map((movie) => (
                <div
                  key={movie.imdbID}
                  onClick={() => setModalMovie(movie)}
                  className="cursor-pointer bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:bg-white/20 transition"
                >
                  <img
                    src={
                      movie.Poster !== "N/A"
                        ? movie.Poster
                        : "/placeholder.png"
                    }
                    alt={movie.Title}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-semibold mb-2">{movie.Title}</h3>
                  <p className="text-white/70 mb-1">{movie.Year}</p>
                  {movie.imdbRating && (
                    <p className="text-yellow-300 text-sm mb-1">
                      ⭐ IMDb: {movie.imdbRating}
                    </p>
                  )}
                  {movie.Actors && (
                    <p className="text-white/60 text-sm">
                      Cast: {movie.Actors.split(",").slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/60 text-sm drop-shadow-[0_0_4px_white]">
            Powered by OMDB API
          </p>
        </div>
      </div>

      {/* Modal */}
      {modalMovie && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setModalMovie(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-[#1e1e2f] to-[#0f0f1a] p-6 rounded-2xl border border-white/20 max-w-xl w-full shadow-2xl text-white"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <img
                src={
                  modalMovie.Poster !== "N/A"
                    ? modalMovie.Poster
                    : "/placeholder.png"
                }
                alt={modalMovie.Title}
                className="w-full md:w-48 h-auto rounded-lg"
              />
              <div>
                <h2 className="text-3xl font-bold mb-2">{modalMovie.Title}</h2>
                <p className="text-sm text-white/70 mb-1">
                  Year: {modalMovie.Year}
                </p>
                <p className="text-sm text-white/70 mb-1">
                  Genre: {modalMovie.Genre}
                </p>
                <p className="text-sm text-yellow-300 mb-1">
                  ⭐ IMDb: {modalMovie.imdbRating}
                </p>
                <p className="text-sm text-white/60 mb-3">
                  Cast: {modalMovie.Actors}
                </p>
                {modalMovie.Plot && (
                  <p className="text-white/80 text-sm italic">
                    "{modalMovie.Plot}"
                  </p>
                )}
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
    </div>
  );
}
